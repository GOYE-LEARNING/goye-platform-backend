import dotenv from "dotenv";
dotenv.config();
export class WeirdService {
  static async FetchCountries() {
    try {
      const res = await fetch(
        "https://api.restcountries.com/countries/v5",
        {
          headers: {
            Authorization: `Bearer rc_live_65a59ff240474513a09c003daf291192`,
          },
        },
      );
      const data = await res.json();

      if (!res.ok) {
        console.log(data);
      }

      return {
        message: "Countries fetched successfully",
        data,
      };
    } catch (error) {
      console.error(error);
    }
  }
}
