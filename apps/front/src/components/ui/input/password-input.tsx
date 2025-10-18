"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input, InputProps } from "./input";
import { Loading } from "../loading";
import { cn } from "@/lib/utils";
import { Icon } from "../icons/icon";

export interface PasswordInputProps extends InputProps {
  groupClassName?: string;
  defaultType?: "password" | "text";
  onTypeChange?: (type: string) => void | Promise<void>;
  loading?: boolean;
  hideToggle?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  groupClassName,
  defaultType = "password",
  onTypeChange,
  hideToggle = false,
  className,
  loading,
  ...props
}) => {
  const [type, setType] = useState(defaultType);

  const toggleType = async () => {
    const newType = type === "password" ? "text" : "password";
    await onTypeChange?.(newType);
    setType(newType);
  };

  return (
    <div className={cn("relative", groupClassName)}>
      <Input
        autoComplete="off"
        {...props}
        type={type}
        className={cn(!hideToggle ? "pr-9" : "", className)}
      />

      {!hideToggle && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <Loading />
          ) : (
            <Icon
              as={type !== "password" ? EyeIcon : EyeOffIcon}
              size={20}
              className="text-muted-foreground cursor-pointer focus:outline-hidden hover:text-foreground"
              tabIndex={-1}
              onClick={toggleType}
            />
          )}
        </div>
      )}
    </div>
  );
};
