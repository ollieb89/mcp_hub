import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

type ServerAllowlistEditorProps = {
  servers: string[];
  onChange: (next: string[]) => void;
  title?: string;
};

const ServerAllowlistEditor = ({
  servers,
  onChange,
  title = "Allowed Servers",
}: ServerAllowlistEditorProps) => {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const value = input.trim();
    if (!value) return;
    if (servers.includes(value)) {
      setInput("");
      return;
    }
    onChange([...servers, value]);
    setInput("");
  };

  const handleRemove = (server: string) => {
    onChange(servers.filter((item) => item !== server));
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <TextField
          size="small"
          label="Add server name"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add
        </Button>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {servers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No allowed servers defined.
          </Typography>
        ) : (
          servers.map((server) => (
            <Chip
              key={server}
              label={server}
              onDelete={() => handleRemove(server)}
              size="small"
            />
          ))
        )}
      </Stack>
    </Box>
  );
};

export default ServerAllowlistEditor;
