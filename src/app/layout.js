import "./globals.css";

export const metadata = {
  title: "LONTHA BOYS PARTY SAGA - OCTOBER 2026",
  description: "An exclusive private retreat at the Canterbury Nature & Wellness Resort, Kandy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Great+Vibes&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen relative pb-12 selection:bg-[#DC2626] selection:text-white bg-[#040204]">
        {children}
      </body>
    </html>
  );
}
