import os
import numpy as np
import cv2
from pycoral.utils.edgetpu import make_interpreter

class AIEngine:
    def __init__(self, model_path, label_path, score_thresh=0.55, iou_thresh=0.45):
        self.score_thresh = score_thresh
        self.iou_thresh = iou_thresh
        
        # Model -> TPU
        self.interpreter = make_interpreter(model_path)
        self.interpreter.allocate_tensors() 
        
        self.input_details = self.interpreter.get_input_details()[0]
        self.output_details = self.interpreter.get_output_details()[0] 
        
        # Imgsz
        self.model_h = self.input_details['shape'][1]
        self.model_w = self.input_details['shape'][2]
        
        # Load object.txt
        self.labels = {}
        if os.path.exists(label_path):
            with open(label_path, 'r') as f:
                for i, line in enumerate(f): 
                    name = line.strip()
                    if name: self.labels[i] = name
                
        np.random.seed(42)
        self.colors = {i: tuple(int(x) for x in np.random.randint(0, 255, 3)) for i in range(len(self.labels))}
        
    def _letterbox_image(self, image):
        ih, iw = image.shape[:2]
        scale = min(self.model_w / iw, self.model_h / ih)
        nw, nh = int(iw * scale), int(ih * scale)
        
        image_resized = cv2.resize(image, (nw, nh))
        new_image = np.full((self.model_h, self.model_w, 3), 114, dtype=np.uint8) 
        
        dx, dy = (self.model_w - nw) // 2, (self.model_h - nh) // 2
        new_image[dy:dy+nh, dx:dx+nw] = image_resized
        
        return new_image, scale, (dx, dy)
        
    def detect(self, img_rgb):
        h_orig, w_orig = img_rgb.shape[:2]
        img_input, img_scale, pad = self._letterbox_image(img_rgb)
        
        in_scale, in_zero_point = self.input_details['quantization']
        if in_scale > 0:
            input_data = (img_input.astype(np.float32) / 255.0 / in_scale + in_zero_point).astype(np.int8)
        else:
            input_data = (img_input.astype(np.float32) / 255.0).astype(np.float32)
            
        self.interpreter.set_tensor(self.input_details['index'], np.expand_dims(input_data, axis=0))
        self.interpreter.invoke()
        
        output_tensor = self.interpreter.get_tensor(self.output_details['index'])[0]
        out_scale, out_zero_point = self.output_details['quantization']
        
        if out_scale > 0:
            output_tensor = (output_tensor.astype(np.float32) - out_zero_point) * out_scale
        else:
            output_tensor = output_tensor.astype(np.float32)
            
        if output_tensor.shape[0] < output_tensor.shape[1]:
            output_tensor = output_tensor.T
            
        raw_boxes = output_tensor[:, :4]
        raw_scores = output_tensor[:, 4:]
        
        if len(raw_boxes) > 0 and np.max(raw_boxes) <= 1.5:
            raw_boxes *= self.model_w 
            
        class_ids = np.argmax(raw_scores, axis=1)
        max_scores = np.max(raw_scores, axis=1)

        mask = max_scores > self.score_thresh
        valid_boxes = raw_boxes[mask]
        valid_scores = max_scores[mask]
        valid_class_ids = class_ids[mask]

        if len(valid_scores) == 0:
            return [] 
            
        pad_x, pad_y = pad
        bx, by, bw, bh = valid_boxes[:, 0], valid_boxes[:, 1], valid_boxes[:, 2], valid_boxes[:, 3]
        
        x, y = (bx - pad_x) / img_scale, (by - pad_y) / img_scale
        w, h = bw / img_scale, bh / img_scale

        left, top = (x - w / 2).astype(int), (y - h / 2).astype(int)
        width, height = w.astype(int), h.astype(int)

        boxes_nms = np.column_stack((left, top, width, height)).tolist()
        confidences_nms = valid_scores.tolist()

        indices = cv2.dnn.NMSBoxes(boxes_nms, confidences_nms, self.score_thresh, self.iou_thresh)
        
        results = []
        if len(indices) > 0:
            for i in indices.flatten(): 
                x, y, w, h_box = boxes_nms[i]
                results.append({
                    'class_id': valid_class_ids[i],
                    'conf': confidences_nms[i],
                    'box': (max(0, x), max(0, y), min(w_orig, x + w), min(h_orig, y + h_box)),
                    'cx': min(max(0, x + w // 2), w_orig - 1),
                    'cy': min(max(0, y + h_box // 2), h_orig - 1)
                })
        return results
