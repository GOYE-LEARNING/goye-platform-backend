import { Receipitence, TransferMoney } from "../interface/interfaces";

export class PricingService {
  public static async GetReceiptanceCode(
    receiptData: Receipitence,
  ): Promise<string> {
    try {
      const response = await fetch(
        "https://api.paystack.co/transferrecipient",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_TEST_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...receiptData,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        console.log(data);
      }

      return data.data.recipient_code;
    } catch (error: any) {
      console.error(error.message);
    }
}

  public static async TransferMoney(
    transferData: TransferMoney 
  ) {
     try {
      const response = await fetch(
        "https://api.paystack.co/transfer",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_TEST_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...transferData,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        console.log(data);
      }

      return data
    } catch (error: any) {
      console.error(error.message);
    }
  }
}
