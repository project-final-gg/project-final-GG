#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// ========================
// WiFi & MQTT Config
// ========================
const char* ssid = "Okiro";
const char* password = "11944225137";

const char* mqtt_server = "broker.hivemq.com";

WiFiClient espClient;
PubSubClient client(espClient);

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// ========================
// MQTT Topics
// ========================
const char* STATUS_TOPIC = "robot/status";
const char* CONTROL_TOPIC = "robot/control/#";

// ========================
// Servo Config
// ========================
int servoMin[6] = {
  120,
  120,
  120,
  120,
  120,
  120
};

int servoMax[6] = {
  620,
  620,
  620,
  620,
  620,
  620
};

int currentAngle[6] = {
  90,
  90,
  90,
  90,
  90,
  45
};

int targetAngle[6] = {
  90,
  90,
  90,
  90,
  90,
  45
};

const int SPEED_DELAY = 15;

unsigned long lastMoveTime = 0;

// ========================
// HEARTBEAT CONFIG
// ========================
unsigned long lastHeartbeat = 0;

const int HEARTBEAT_INTERVAL = 2000;

// ========================
// Ultrasonic Config
// ========================
#define TRIG_PIN 32
#define ECHO_PIN 33

const int SAFE_DISTANCE_CM = 7;

bool isEmergencyStop = false;
bool enableBrake = true;

unsigned long lastSonarTime = 0;

int currentDistance = 999;

// ========================
// Convert Angle -> PWM
// ========================
int angleToPulse(int joint, int angle) {

  return map(
    angle,
    0,
    180,
    servoMin[joint],
    servoMax[joint]
  );
}

// ========================
// Ultrasonic Distance
// ========================
int getDistance() {

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(
    ECHO_PIN,
    HIGH,
    30000
  );

  if (duration == 0) {
    return 999;
  }

  return duration * 0.034 / 2;
}

// ========================
// WiFi Connect
// ========================
void setup_wifi() {

  Serial.println("");
  Serial.println("====================================");
  Serial.println("📶 CONNECTING WIFI");
  Serial.println("====================================");

  WiFi.begin(
    ssid,
    password
  );

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);

    Serial.print(".");
  }

  Serial.println("");
  Serial.println("");

  Serial.println("✅ WIFI CONNECTED");

  Serial.print("🌐 IP ADDRESS : ");
  Serial.println(WiFi.localIP());

  Serial.println("====================================");
}

// ========================
// MQTT Reconnect
// ========================
void reconnect() {

  while (!client.connected()) {

    Serial.println("");
    Serial.println("====================================");
    Serial.println("🔄 CONNECTING MQTT");
    Serial.println("====================================");

    String clientId =
      "esp32-robot-" +
      String(random(0xffff), HEX);

    if (
      client.connect(
        clientId.c_str(),
        STATUS_TOPIC,
        0,
        true,
        "offline"
      )
    ) {

      Serial.println("🟢 MQTT CONNECTED");

      // Subscribe Topics
      client.subscribe(CONTROL_TOPIC);

      Serial.print("📡 SUBSCRIBED : ");
      Serial.println(CONTROL_TOPIC);

      // Publish Online Status
      bool ok = client.publish(
        STATUS_TOPIC,
        "online",
        true
      );

      Serial.print("🚀 STATUS PUBLISH : ");

      if (ok) {
        Serial.println("SUCCESS");
      }
      else {
        Serial.println("FAILED");
      }

      Serial.println("====================================");
    }

    else {

      Serial.print("❌ MQTT FAILED, rc=");
      Serial.println(client.state());

      Serial.println("⏳ RETRY IN 2 SEC");
      Serial.println("====================================");

      delay(2000);
    }
  }
}

// ========================
// MQTT Callback
// ========================
void callback(
  char* topic,
  byte* payload,
  unsigned int length
) {

  String message = "";

  // ========================
  // Convert Payload
  // ========================
  for (int i = 0; i < length; i++) {

    message += (char)payload[i];
  }

  int angle = message.toInt();

  String strTopic = String(topic);

  // ========================
  // MQTT LOG
  // ========================
  Serial.println("");
  Serial.println("====================================");
  Serial.println("📩 MQTT MESSAGE");

  Serial.print("📌 Topic : ");
  Serial.println(strTopic);

  Serial.print("📦 Payload : ");
  Serial.println(message);

  // ========================
  // Reset Emergency Stop
  // ========================
  isEmergencyStop = false;

  // ========================
  // Brake Enable
  // ========================
  if (strTopic == "robot/control/brake_enable") {

    enableBrake = (angle == 1);

    Serial.println("");
    Serial.println("⚙️ BRAKE CONTROL");

    Serial.print("🌟 Ultrasonic Brake : ");

    Serial.println(
      enableBrake
      ? "ON"
      : "OFF"
    );

    Serial.println("====================================");

    return;
  }

  // ========================
  // Servo Mapping
  // ========================
  String servoName = "";

  int servoIndex = -1;

  if (strTopic == "robot/control/base") {

    servoName = "base";
    servoIndex = 0;
  }

  else if (strTopic == "robot/control/shoulder") {

    servoName = "shoulder";
    servoIndex = 1;
  }

  else if (strTopic == "robot/control/elbow") {

    servoName = "elbow";
    servoIndex = 2;
  }

  else if (strTopic == "robot/control/wrist_v") {

    servoName = "wrist_v";
    servoIndex = 3;
  }

  else if (strTopic == "robot/control/wrist_r") {

    servoName = "wrist_r";
    servoIndex = 4;
  }

  else if (strTopic == "robot/control/gripper") {

    servoName = "gripper";
    servoIndex = 5;
  }

  // ========================
  // Servo Control
  // ========================
  if (servoIndex != -1) {

    int oldAngle =
      targetAngle[servoIndex];

    targetAngle[servoIndex] = angle;

    Serial.println("");
    Serial.println("🤖 SERVO COMMAND");

    Serial.print("🦾 Joint : ");
    Serial.println(servoName);

    Serial.print("📐 Previous Angle : ");
    Serial.println(oldAngle);

    Serial.print("🎯 Target Angle : ");
    Serial.println(angle);

    Serial.println("====================================");
  }

  // ========================
  // Unknown Topic
  // ========================
  else {

    Serial.println("");
    Serial.println("⚠️ UNKNOWN TOPIC");

    Serial.print("❓ Topic : ");
    Serial.println(strTopic);

    Serial.println("====================================");
  }
}

// ========================
// Setup
// ========================
void setup() {

  Serial.begin(115200);

  Serial.println("");
  Serial.println("====================================");
  Serial.println("🤖 ESP32 ROBOT STARTING");
  Serial.println("====================================");

  // Ultrasonic
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Servo Driver
  pwm.begin();
  pwm.setPWMFreq(60);

  Serial.println("✅ PCA9685 READY");

  // WiFi
  setup_wifi();

  // MQTT
  client.setServer(
    mqtt_server,
    1883
  );

  client.setCallback(callback);

  Serial.println("✅ MQTT CALLBACK READY");

  Serial.println("");
  Serial.println("🚀 ROBOT SYSTEM READY");
  Serial.println("====================================");
}

// ========================
// Main Loop
// ========================
void loop() {

  // ========================
  // MQTT Reconnect
  // ========================
  if (!client.connected()) {

    reconnect();
  }

  client.loop();

  // ========================
  // MQTT Heartbeat
  // ========================
  if (
    millis() - lastHeartbeat
    >= HEARTBEAT_INTERVAL
  ) {

    lastHeartbeat = millis();

    bool ok = client.publish(
      STATUS_TOPIC,
      "online",
      true
    );

    Serial.println("");

    if (ok) {

      Serial.println("💓 HEARTBEAT SENT : online");
    }

    else {

      Serial.println("❌ HEARTBEAT FAILED");
    }
  }

  // ========================
  // Ultrasonic Check
  // ========================
  if (
    millis() - lastSonarTime
    >= 100
  ) {

    lastSonarTime = millis();

    currentDistance =
      getDistance();

    bool isMoving = false;

    for (int i = 0; i < 5; i++) {

      if (
        currentAngle[i]
        != targetAngle[i]
      ) {

        isMoving = true;
      }
    }

    // ========================
    // Emergency Stop
    // ========================
    if (
      enableBrake &&
      isMoving &&
      currentDistance <= SAFE_DISTANCE_CM &&
      !isEmergencyStop
    ) {

      Serial.println("");
      Serial.println("====================================");
      Serial.println("🛑 EMERGENCY STOP");

      Serial.print("📏 Distance : ");
      Serial.print(currentDistance);
      Serial.println(" cm");

      isEmergencyStop = true;

      for (int i = 0; i < 5; i++) {

        targetAngle[i] =
          currentAngle[i];
      }

      Serial.println("🤖 ALL MOTORS STOPPED");
      Serial.println("====================================");
    }
  }

  // ========================
  // Smooth Servo Movement
  // ========================
  if (
    millis() - lastMoveTime
    >= SPEED_DELAY
  ) {

    lastMoveTime = millis();

    for (int i = 0; i < 6; i++) {

      if (
        currentAngle[i]
        != targetAngle[i]
      ) {

        if (
          currentAngle[i]
          < targetAngle[i]
        ) {

          currentAngle[i]++;
        }

        else {

          currentAngle[i]--;
        }

        pwm.setPWM(
          i,
          0,
          angleToPulse(
            i,
            currentAngle[i]
          )
        );
      }
    }
  }
}