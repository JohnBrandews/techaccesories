ALTER TABLE "Order"
ADD COLUMN "paymentProviderReference" TEXT,
ADD COLUMN "paymentCheckoutRequestId" TEXT,
ADD COLUMN "paymentReceipt" TEXT;

CREATE UNIQUE INDEX "Order_paymentCheckoutRequestId_key" ON "Order"("paymentCheckoutRequestId");
