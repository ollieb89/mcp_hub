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

type CategoryListEditorProps = {
  categories: string[];
  onChange: (next: string[]) => void;
  title?: string;
};

const CategoryListEditor = ({
  categories,
  onChange,
  title = "Allowed Categories",
}: CategoryListEditorProps) => {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const value = input.trim();
    if (!value) return;
    if (categories.includes(value)) {
      setInput("");
      return;
    }
    onChange([...categories, value]);
    setInput("");
  };

  const handleRemove = (category: string) => {
    onChange(categories.filter((item) => item !== category));
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <TextField
          size="small"
          label="Add category"
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
        {categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No categories defined.
          </Typography>
        ) : (
          categories.map((category) => (
            <Chip
              key={category}
              label={category}
              onDelete={() => handleRemove(category)}
              size="small"
            />
          ))
        )}
      </Stack>
    </Box>
  );
};

export default CategoryListEditor;
