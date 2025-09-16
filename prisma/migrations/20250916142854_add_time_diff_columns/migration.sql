/*
  Warnings:

  - You are about to drop the `cctv` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sensors` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "cctv_camera_id_key";

-- DropIndex
DROP INDEX "sensors_sensor_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "cctv";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "sensors";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "surveillance_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'cctv',
    "metadata" TEXT,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "emergency_sops" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "emergency_sop_steps" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sop_id" INTEGER NOT NULL,
    "step_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "emergency_sop_steps_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "emergency_sops" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "emergency_incidents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sop_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'high',
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "emergency_incidents_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "emergency_sops" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "emergency_step_executions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "incident_id" INTEGER NOT NULL,
    "step_id" INTEGER NOT NULL,
    "step_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "executed_at" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "emergency_step_executions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "emergency_incidents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "emergency_step_executions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "emergency_sop_steps" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "emergency_pdfs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cctv_streams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stream_url" TEXT NOT NULL,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "gas_sensor_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sensor_id" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "level" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time_diff" INTEGER
);

-- CreateTable
CREATE TABLE "gas_sensor_mappings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sensor_id" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cctv_detections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cctv_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time_diff" INTEGER
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_beacons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beacon_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mac_address" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "major" INTEGER NOT NULL,
    "minor" INTEGER NOT NULL,
    "tx_power" INTEGER NOT NULL,
    "location" TEXT,
    "gateway_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "beacons_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "gateways" ("gateway_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_beacons" ("beacon_id", "created_at", "id", "location", "mac_address", "major", "minor", "name", "status", "tx_power", "updated_at", "uuid") SELECT "beacon_id", "created_at", "id", "location", "mac_address", "major", "minor", "name", "status", "tx_power", "updated_at", "uuid" FROM "beacons";
DROP TABLE "beacons";
ALTER TABLE "new_beacons" RENAME TO "beacons";
CREATE UNIQUE INDEX "beacons_beacon_id_key" ON "beacons"("beacon_id");
CREATE TABLE "new_gateways" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gateway_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "ip_address" TEXT,
    "mqtt_topic" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "proximity_threshold" REAL NOT NULL DEFAULT 5.0,
    "auto_vibration" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_gateways" ("created_at", "gateway_id", "id", "ip_address", "location", "mqtt_topic", "name", "status", "updated_at") SELECT "created_at", "gateway_id", "id", "ip_address", "location", "mqtt_topic", "name", "status", "updated_at" FROM "gateways";
DROP TABLE "gateways";
ALTER TABLE "new_gateways" RENAME TO "gateways";
CREATE UNIQUE INDEX "gateways_gateway_id_key" ON "gateways"("gateway_id");
CREATE TABLE "new_proximity_alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beacon_id" TEXT NOT NULL,
    "gateway_id" TEXT NOT NULL,
    "worker_id" INTEGER,
    "rssi" INTEGER,
    "distance" REAL NOT NULL,
    "threshold" REAL NOT NULL DEFAULT 5.0,
    "is_alert" BOOLEAN NOT NULL DEFAULT false,
    "alert_type" TEXT,
    "message" TEXT,
    "alert_time" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proximity_alerts_beacon_id_fkey" FOREIGN KEY ("beacon_id") REFERENCES "beacons" ("beacon_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proximity_alerts_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "gateways" ("gateway_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proximity_alerts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_proximity_alerts" ("alert_time", "beacon_id", "created_at", "distance", "gateway_id", "id", "is_alert", "rssi", "threshold", "worker_id") SELECT "alert_time", "beacon_id", "created_at", "distance", "gateway_id", "id", "is_alert", "rssi", "threshold", "worker_id" FROM "proximity_alerts";
DROP TABLE "proximity_alerts";
ALTER TABLE "new_proximity_alerts" RENAME TO "proximity_alerts";
CREATE INDEX "proximity_alerts_created_at_idx" ON "proximity_alerts"("created_at");
CREATE INDEX "proximity_alerts_is_alert_idx" ON "proximity_alerts"("is_alert");
CREATE INDEX "proximity_alerts_beacon_id_gateway_id_idx" ON "proximity_alerts"("beacon_id", "gateway_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "surveillance_records_created_at_idx" ON "surveillance_records"("created_at");

-- CreateIndex
CREATE INDEX "surveillance_records_type_idx" ON "surveillance_records"("type");

-- CreateIndex
CREATE INDEX "surveillance_records_severity_idx" ON "surveillance_records"("severity");

-- CreateIndex
CREATE INDEX "surveillance_records_status_idx" ON "surveillance_records"("status");

-- CreateIndex
CREATE INDEX "gas_sensor_data_building_timestamp_idx" ON "gas_sensor_data"("building", "timestamp");

-- CreateIndex
CREATE INDEX "gas_sensor_data_sensor_id_timestamp_idx" ON "gas_sensor_data"("sensor_id", "timestamp");

-- CreateIndex
CREATE INDEX "gas_sensor_data_timestamp_idx" ON "gas_sensor_data"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "gas_sensor_mappings_sensor_id_key" ON "gas_sensor_mappings"("sensor_id");

-- CreateIndex
CREATE INDEX "cctv_detections_cctv_name_timestamp_idx" ON "cctv_detections"("cctv_name", "timestamp");

-- CreateIndex
CREATE INDEX "cctv_detections_status_timestamp_idx" ON "cctv_detections"("status", "timestamp");

-- CreateIndex
CREATE INDEX "cctv_detections_timestamp_idx" ON "cctv_detections"("timestamp");
