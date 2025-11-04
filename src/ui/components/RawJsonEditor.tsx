import { Suspense, lazy } from "react";
import { Box, Button, CircularProgress, Stack } from "@mui/material";

const MonacoEditor = lazy(async () => {
  const module = await import("@monaco-editor/react");
  return { default: module.default };
});

const EditorFallback = ({ height }: { height: number }) => (
  <Box
    sx={{
      height,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "background.paper",
      borderRadius: 1,
      border: 1,
      borderColor: "divider",
    }}
  >
    <CircularProgress aria-label="Loading JSON editor" />
  </Box>
);

type RawJsonEditorProps = {
  value: string;
  height?: number;
  onChange: (next: string) => void;
  onFormat?: () => void;
};

const RawJsonEditor = ({
  value,
  height = 420,
  onChange,
  onFormat,
}: RawJsonEditorProps) => (
  <Stack spacing={1.5}>
    <Suspense fallback={<EditorFallback height={height} />}>
      <MonacoEditor
        height={height}
        defaultLanguage="json"
        theme="vs-dark"
        value={value}
        onChange={(next) => onChange(next ?? "")}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
        }}
      />
    </Suspense>
    {onFormat && (
      <Button variant="outlined" size="small" onClick={onFormat}>
        Format JSON
      </Button>
    )}
  </Stack>
);

export default RawJsonEditor;
