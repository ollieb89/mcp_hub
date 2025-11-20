/**
 * CategorySelector Component
 * Multi-select autocomplete for tool categories
 * Extracts unique categories from tools data
 */
import { useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useTools } from '@ui/api/hooks/useTools';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export interface CategorySelectorProps {
  /**
   * Currently selected categories
   */
  value: string[];
  /**
   * Callback when selected categories change
   */
  onChange: (categories: string[]) => void;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
}

/**
 * CategorySelector allows filtering tools by category
 *
 * Features:
 * - Multi-select with checkboxes
 * - Search/filter capabilities
 * - Extracts unique categories from tools data
 * - Loading state while tools query pending
 * - Controlled component (value + onChange props)
 *
 * @example
 * ```tsx
 * function FilterPanel() {
 *   const [categories, setCategories] = useState<string[]>([]);
 *
 *   return (
 *     <CategorySelector
 *       value={categories}
 *       onChange={setCategories}
 *       disabled={false}
 *     />
 *   );
 * }
 * ```
 */
export function CategorySelector({
  value,
  onChange,
  disabled = false,
}: CategorySelectorProps) {
  const { data: toolsData, isLoading } = useTools();

  // Extract unique categories from tools
  const categories = useMemo(() => {
    if (!toolsData?.tools) return [];
    const categorySet = new Set<string>();
    toolsData.tools.forEach((tool) => {
      tool.categories.forEach((cat) => {
        categorySet.add(cat);
      });
    });
    return Array.from(categorySet).sort();
  }, [toolsData]);

  return (
    <Autocomplete
      multiple
      options={categories}
      disableCloseOnSelect
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      getOptionLabel={(option) => option}
      renderOption={(props, option, { selected }) => (
        <li {...props} key={option}>
          <Checkbox
            icon={icon}
            checkedIcon={checkedIcon}
            style={{ marginRight: 8 }}
            checked={selected}
          />
          {option}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Filter Categories"
          placeholder={value.length === 0 ? 'Select categories...' : undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      loading={isLoading}
      disabled={disabled || isLoading}
      sx={{ minWidth: 300 }}
    />
  );
}
