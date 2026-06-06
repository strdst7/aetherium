import React from "react";
import { Button } from "./Button";
import compliance from "../../../compliance_report.json";

export default {
  title: "Aetherium/Button",
  component: Button,
  parameters: {
    compliance: compliance.compliance_score
  }
};

export const Primary = () => <Button label="Aetherium Button" />;
