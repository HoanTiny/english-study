import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // react-hooks v6 (Next 16) coi MỌI setState đồng bộ trong effect là lỗi.
      // Trong app này các chỗ đó là escape-hatch hợp lệ: đọc localStorage sau mount
      // (tránh lệch hydration), reset/đặt cờ loading trước khi gọi async, đóng menu
      // khi đổi route — không gây vòng lặp render. Để "warn" để vẫn thấy mà không
      // chặn lint; chỗ mới nên cân nhắc tránh.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
