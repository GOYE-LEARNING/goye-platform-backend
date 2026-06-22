import dotenv from "dotenv";
dotenv.config();
export class WeirdService {
  static async FetchCountries() {
    try {
      const res = await fetch(
        "https://api.restcountries.com/countries/v5",
        {
          headers: {
            Authorization: `Bearer ${process.env.CONTRIES_API}`,
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
