export default function DeepCamera() {
  return (
    <div className="deepcam-page">

      <div className="deepcam-card">

        <div className="card-title">
          Deep Camera
        </div>

        <div className="camera-box">
          Waiting for Deep Camera...
        </div>

      </div>

      <div className="object-card">

        <div className="card-title">
          Object
        </div>

        <div className="object-tags">
          <span className="tag">Bottle</span>
          <span className="tag">Pen</span>
        </div>

        <button className="import-btn">
          Import Object +
        </button>

      </div>

    </div>
  );
}