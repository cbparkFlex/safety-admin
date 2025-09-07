-- CreateTable
CREATE TABLE "rssi_calibration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beacon_id" TEXT NOT NULL,
    "gateway_id" TEXT NOT NULL,
    "distance" REAL NOT NULL,
    "rssi" INTEGER NOT NULL,
    "samples" INTEGER NOT NULL DEFAULT 1,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rssi_calibration_beacon_id_fkey" FOREIGN KEY ("beacon_id") REFERENCES "beacons" ("beacon_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rssi_calibration_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "gateways" ("gateway_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rssi_calibration_beacon_id_gateway_id_distance_key" ON "rssi_calibration"("beacon_id", "gateway_id", "distance");
