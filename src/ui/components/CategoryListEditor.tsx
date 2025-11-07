import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  Chip,
  FormHelperText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, useCallback, KeyboardEvent } from "react";

type CategoryListEditorProps = {
  categories: string[];
  onChange: (next: string[]) => void;
  title?: string;
  helperText?: string;
};

const CategoryListEditor = ({
  categories,
  onChange,
  title = "Allowed Categories",
  helperText,
}: CategoryListEditorProps) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    const value = input.trim().toLowerCase();

    if (!value) {
      setError("Category name cannot be empty");
      return;
    }

    if (categories.includes(value)) {
      setError("Category already exists");
      setInput("");
      return;
    }

    // Validate category name format (alphanumeric and underscores only)
    if (!/^[a-z0-9_]+$/.test(value)) {
      setError("Category name must contain only lowercase letters, numbers, and underscores");
      return;
    }

    onChange([...categories, value]);
    setInput("");
    setError(null);
  }, [input, categories, onChange]);

  const handleRemove = useCallback((category: string) => {
    onChange(categories.filter((item) => item !== category));
  }, [categories, onChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    } else if (event.key === "Escape") {
      setInput("");
      setError(null);
    }
  }, [handleAdd]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      {helperText && (
        <FormHelperText sx={{ mt: -0.5, mb: 1.5 }}>
          {helperText}
        </FormHelperText>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="flex-start">
        <TextField
          size="small"
          label="Add category"
          placeholder="e.g., github, filesystem"
          value={input}
          error={Boolean(error)}
          helperText={error || "Press Enter to add, Escape to clear"}
          onChange={(event) => {
            setInput(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          inputProps={{
            "aria-label": "Category name input",
            "aria-describedby": "category-input-helper",
          }}
          sx={{ flexGrow: 1, maxWidth: 300 }}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={!input.trim()}
          aria-label="Add category"
          sx={{ mt: 0.5 }}
        >
          Add
        </Button>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        role="list"
        aria-label="Category list"
      >
        {categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No categories defined. Add categories to filter tools by category.
          </Typography>
        ) : (
          categories.map((category) => (
            <Chip
              key={category}
              label={category}
              onDelete={() => handleRemove(category)}
              size="small"
              color="primary"
              variant="outlined"
              role="listitem"
              aria-label={`Category: ${category}`}
            />
          ))
        )}
      </Stack>
    </Box>
  );
};

export default CategoryListEditor;
