import { Font } from "@react-pdf/renderer";

// Registra Montserrat (regular + bold) y una familia explícita para la versión bold
Font.register({
  family: "Montserrat",
  fonts: [
    { src: "/fonts/Montserrat-Regular.ttf", fontWeight: 400, fontStyle: "normal" },
    { src: "/fonts/Montserrat-Bold.ttf", fontWeight: 700, fontStyle: "normal" },
  ],
});

// Registro adicional como familia separada para usarla cuando se necesite asegurar bold sin fallback
Font.register({
  family: "Montserrat-Bold",
  src: "/fonts/Montserrat-Bold.ttf",
  fontWeight: 700,
  fontStyle: "normal",
});

// Exporta nombres de familias para usarlas en estilos
export const fontFamilies = {
  Montserrat: "Montserrat",
  MontserratBold: "Montserrat-Bold",
};

// ...si en el futuro registras más fuentes añádelas aquí...
