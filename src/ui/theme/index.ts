import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6C5CE7",
    },
    secondary: {
      main: "#00CEC9",
    },
    background: {
      default: "#121212",
      paper: "#1E1E28",
    },
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
});

export default theme;
