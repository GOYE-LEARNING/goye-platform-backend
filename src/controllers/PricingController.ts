import { Body, Controller, Post, Route, Tags } from "tsoa";
import { PricingService } from "../services/pricingService";
import { Receipitence, TransferMoney } from "../interface/interfaces";
@Tags("Pricing API integration")
@Route("pricing")
export class PricingController extends Controller {
  @Post("/transferRecipitent")
  public async TransferRecipitent(@Body() data: Receipitence) {
    const code = await PricingService.GetReceiptanceCode({
      ...data,
    });

    return code;
  }

  @Post("/transfer")
  public async Transfer(@Body() data: TransferMoney) {
    const code = await PricingService.TransferMoney({
      ...data,
    });

    return code;
  }
}
