import { ReactNode } from "react";
import { Box, Tab, Tabs } from "@mui/material";

export type ConfigTab = {
  label: string;
  content: ReactNode;
};

type ConfigTabsProps = {
  value: number;
  onChange: (index: number) => void;
  tabs: ConfigTab[];
};

const ConfigTabs = ({ value, onChange, tabs }: ConfigTabsProps) => (
  <Box>
    <Tabs
      value={value}
      onChange={(_, index) => onChange(index)}
      aria-label="Configuration tabs"
      sx={{ mb: 3 }}
    >
      {tabs.map((tab) => (
        <Tab key={tab.label} label={tab.label} />
      ))}
    </Tabs>
    {tabs.map((tab, index) => (
      <Box
        key={tab.label}
        role="tabpanel"
        hidden={value !== index}
        id={`config-tabpanel-${index}`}
        aria-labelledby={`config-tab-${index}`}
        sx={{ display: value === index ? "block" : "none" }}
      >
        {value === index && tab.content}
      </Box>
    ))}
  </Box>
);

export default ConfigTabs;
