import admin from "firebase-admin";

// Initialize Firebase Admin directly with config
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "goye-media",
    clientEmail: "firebase-adminsdk-fbsvc@goye-media.iam.gserviceaccount.com",
    privateKey:
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCocZ3SMEPg+D5f\n4oIWxwRRbuJgtK+NR4BWa5JD5oF/eni+ocEjgQbAVeHUO20u+Jz+vYqrQpjjENfw\nlbl8btSO0pIuBXijtSk4zRr4ntE5jV2mAtnk5y8IhMIQMvKR5grL2CtnldAbxF+G\naq/W5cLuFhBcUf3RSqHGIVC49rhJrDv0X53TPFr+nY4UoJE9qTxZl1sc4RyrDNHV\nIM+o0kBb+FhJ2p7gDgENGMNxN7hkGKJl1J5emj0n+Fi9M5vbKSKDLIQ9j7tgqYox\nZG7RB3VcLSrLhG+QaTm/rnlSd++eqsZRj+Omg3UBsyY7qp26Lyupxr7FtYJU+fVH\nuzrWwLALAgMBAAECggEABtMHk67x6ROVpK6EGmZ4wHsvamns8i/d6A0WpsVCz4aH\njXhMig2IV6gtweVLIKE2QcSDHDooAIxmUJsi9y10U3mo2NAkRERVhbVwQiIJFFMB\nDXXwcauDcSMTy7KMt6gsHXhwwGhw6dcUZFk+g4SD17/cF37DkO78S+R9+pMVrKJf\n+voknb7U2WuadRdwa0j6tgoxeCHKx7Uvarjs96f6yACLEIrF9mIL0k6hrpLCAuL1\n6Cvoz1OA76SBtiXYvLJ9RFeLFSQZtRokFS85IepZFjrk0cpuHrvq6Ifc1YtC8UM+\nAO9uhG9nGvE5mFDsxDeOgDJl0hDncGNubPcCBFmlvQKBgQDm543JFFt6lSS7jqJV\n/sCU/naigNii0FA61bxxCsItpylp5q9JnjNxPRlROwdwVMKk7oJWSlfR+COahJ70\n+jvV77DwGdt8TFyMpTkE5f/WH67Q9EU6mgnrpcmsGoXRe0fmBkAW6KgVerZI3iVH\nEo05XwiJRX740Hi8ujOq2bYkjwKBgQC6wDiym+7IkrG8S/4upFDdDsaWajFt1amA\n6UeirdkS6rzc5VBni4v2kt/vb6BGvo7pUYtMFv4+VuKLaTufe4YfIeAAxCeKy1xZ\n1ZOoKD1XakLC3jaFoWkHg4HYBq8kZyYTjeCCJQusbw+U8/3qIAp0zGZfXWa+nU/s\nEq+oN/OSxQKBgAmpKn99QI6SauUGBLjAXeJd+yy1Y1r8iD7N7oJ0RseONOdfZXoZ\nCmH0gniplZgXk8U+zWk61w3L6gFvBw+M4LAExUxmaI58y2p/BzGzRc75qGDJt5PK\nGhwn5ZYzzeGD3PA81rWeqlmrtrC5yql8lzgNR9gmdjeG0WZkDAFb9oj1AoGBAKCV\nXauoDkIGcjL6HY252Zbcd8MreWl6ypCBCApI91oe41wHC4aeJjJWxZy8HdP3VCgo\n6GD7fI/aYl+Ck7RloUTv+hBum5nrmHPfBWMZhvW9975dGgD6dLfzSxmZVc01rTYv\nT5hZhpo1ve5ViEdkWdlpUbY7OHg8CVd0EfvScO4JAoGAYXuFtXMmNLP5mRHtbF2i\nQL31L6V43CMbuCWacdnLkDf3IPsEqzE32VaEtMQBmRDngtOIHg/ZUOUtmF2vqf4W\naJoLlACU/I34sY3V9sCAmszB5z9zaoYW6CzwdFonOEduWNS/nXDIAO1MarEBLs7D\nWgYHPjwil7VbeqONqd6VYpk=\n-----END PRIVATE KEY-----\n",
  }),
  storageBucket: "goye-media.firebasestorage.app",
});

export const bucket = admin.storage().bucket();
export default admin;
