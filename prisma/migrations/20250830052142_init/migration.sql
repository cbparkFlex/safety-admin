-- CreateTable
CREATE TABLE "workers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "birth_date" DATETIME NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "work_field" TEXT NOT NULL,
    "affiliation" TEXT NOT NULL,
    "health_precautions" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "administrators" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sensor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cctv" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "camera_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "monitoring_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "workers_equipment_id_key" ON "workers"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "administrators_username_key" ON "administrators"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_sensor_id_key" ON "sensors"("sensor_id");

-- CreateIndex
CREATE UNIQUE INDEX "cctv_camera_id_key" ON "cctv"("camera_id");
