import { v2 as cloudinary } from "cloudinary";

//To configure images
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
    api_key: process.env.CLOUDINARY_API_KEY
});

export default cloudinary


