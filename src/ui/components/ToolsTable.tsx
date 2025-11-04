import SearchIcon from "@mui/icons-material/Search";
import BuildIcon from "@mui/icons-material/Build";
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { ToolSummary } from "@api/tools";

type ToolsTableProps = {
  tools: ToolSummary[];
  loading?: boolean;
};

const ToolsTable = ({ tools, loading = false }: ToolsTableProps) => {
  const [query, setQuery] = useState("");
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const servers = useMemo(
    () => Array.from(new Set(tools.map((tool) => tool.serverDisplayName || tool.server))),
    [tools],
  );

  const categories = useMemo(
    () => Array.from(new Set(tools.flatMap((tool) => tool.categories || []))),
    [tools],
  );

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesQuery =
        query.length === 0 ||
        tool.name.toLowerCase().includes(query.toLowerCase()) ||
        tool.description.toLowerCase().includes(query.toLowerCase());
      const matchesServer =
        serverFilter === "all" ||
        tool.server === serverFilter ||
        tool.serverDisplayName === serverFilter;
      const matchesCategory =
        categoryFilter === "all" ||
        tool.categories?.some(
          (category) => category.toLowerCase() === categoryFilter.toLowerCase(),
        );
      return matchesQuery && matchesServer && matchesCategory;
    });
  }, [tools, query, serverFilter, categoryFilter]);

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        spacing={2}
        flexWrap="wrap"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <BuildIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Available Tools
          </Typography>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          flexWrap="wrap"
          sx={{ width: "100%", maxWidth: 640 }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Search tools…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="server-filter-label">Server</InputLabel>
            <Select
              labelId="server-filter-label"
              label="Server"
              value={serverFilter}
              onChange={(event) => setServerFilter(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {servers.map((server) => (
                <MenuItem key={server} value={server}>
                  {server}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="category-filter-label">Category</InputLabel>
            <Select
              labelId="category-filter-label"
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tool</TableCell>
              <TableCell>Server</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Categories</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ py: 3 }}
                  >
                    No tools match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTools.map((tool) => (
                <TableRow key={`${tool.server}-${tool.name}`} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {tool.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{tool.serverDisplayName || tool.server}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {tool.description || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {(tool.categories ?? []).map((category) => (
                        <Chip key={category} size="small" label={category} variant="outlined" />
                      ))}
                      {(!tool.categories || tool.categories.length === 0) && (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ToolsTable;
