'use client';

import * as React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Button, CircularProgress, IconButton, InputAdornment, TextField, Tooltip, type ButtonProps, type TextFieldProps } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useLocale, useMessages } from '@/i18n/client';
import { translateValidation } from '@/i18n/validation';

type FormTextFieldProps<T extends FieldValues> = Omit<TextFieldProps, 'name'> & {
  name: Path<T>;
  control: Control<T>;
  /** Converts the raw input value (e.g. to number). */
  transform?: (value: string) => unknown;
};

/** MUI TextField bound to React Hook Form, showing Zod error messages. */
export function FormTextField<T extends FieldValues>({ name, control, transform, helperText, ...props }: FormTextFieldProps<T>) {
  const locale = useLocale();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          {...field}
          value={field.value ?? ''}
          onChange={(e) => field.onChange(transform ? transform(e.target.value) : e.target.value)}
          inputRef={field.ref}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error ? translateValidation(fieldState.error.message, locale) : helperText}
        />
      )}
    />
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField<T extends FieldValues>(props: FormTextFieldProps<T>) {
  const [visible, setVisible] = React.useState(false);
  const t = useMessages('common');
  return (
    <FormTextField
      {...props}
      type={visible ? 'text' : 'password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={visible ? t.hidePassword : t.showPassword}>
              <IconButton aria-label={visible ? t.hidePassword : t.showPassword} onClick={() => setVisible((v) => !v)} edge="end">
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}

/** Button with an inline spinner; disabled while loading. */
export function LoadingButton({ loading, children, disabled, startIcon, ...props }: ButtonProps & { loading?: boolean }) {
  return (
    <Button {...props} disabled={disabled || loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : startIcon} aria-busy={loading}>
      {children}
    </Button>
  );
}
