-- CreateTable
CREATE TABLE "beacons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beacon_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mac_address" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "major" INTEGER NOT NULL,
    "minor" INTEGER NOT NULL,
    "tx_power" INTEGER NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "gateways" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gateway_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "mqtt_topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "proximity_alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beacon_id" TEXT NOT NULL,
    "gateway_id" TEXT NOT NULL,
    "worker_id" INTEGER,
    "rssi" INTEGER NOT NULL,
    "distance" REAL NOT NULL,
    "threshold" REAL NOT NULL DEFAULT 5.0,
    "is_alert" BOOLEAN NOT NULL DEFAULT false,
    "alert_time" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proximity_alerts_beacon_id_fkey" FOREIGN KEY ("beacon_id") REFERENCES "beacons" ("beacon_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proximity_alerts_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "gateways" ("gateway_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proximity_alerts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "beacons_beacon_id_key" ON "beacons"("beacon_id");

-- CreateIndex
CREATE UNIQUE INDEX "gateways_gateway_id_key" ON "gateways"("gateway_id");
