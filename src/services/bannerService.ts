// services/bannerbearService.ts
import { Bannerbear } from 'bannerbear';

const bb = new Bannerbear(process.env.BANNERBEAR_API_KEY as string);

export interface CertificateModifications {
  user_name: string;
  date_completed: string;
  task_completed: string;
  course_title: string;
}

/**
 * Generate a course completion certificate using Bannerbear
 */
export async function generateCertificate(
  modifications: CertificateModifications
): Promise<string> {
  try {
    const image = await bb.create_image(
      process.env.BANNERBEAR_CERTIFICATE_TEMPLATE as string,
      {
        modifications: [
          {
            name: 'user_name',
            text: modifications.user_name,
          },
          {
            name: 'date_completed',
            text: modifications.date_completed,
          },
          {
            name: 'task_completed',
            text: modifications.task_completed,
          },
          {
            name: 'course_title',
            text: modifications.course_title,
          },
        ],
        transparent: false,
      },
      true // Wait for image to be generated
    );

    return image.image_url;
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}