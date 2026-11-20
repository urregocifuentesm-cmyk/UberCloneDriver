// Code documentation: Driver registration tab or registration state logic.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TAB_FIELDS, validateAll } from '../../utils/validators';

const Ctx = createContext(null);
export const useReg = () => useContext(Ctx);

export function RegistrationProvider({ initial, children }) {
  const [form, setForm] = useState({ language: 'es', acceptTerms: false, ...initial });
  const [touched, setTouched] = useState({});
  const errors = useMemo(() => validateAll(form), [form]);

  const setField = useCallback((key, value) => {
    setForm((p) => ({ ...p, [key]: key === 'plate' ? String(value).toUpperCase() : value }));
    setTouched((p) => ({ ...p, [key]: true }));
  }, []);
  const touch = useCallback((key) => setTouched((p) => ({ ...p, [key]: true })), []);

  // Props listas para los campos: error visible solo si ya se tocó.
  const bind = (key) => ({
    value: form[key],
    onChange: (v) => setField(key, v),
    onChangeText: (v) => setField(key, v),
    onBlur: () => touch(key),
    error: touched[key] ? errors[key] : '',
  });
  const tabValid = (tab) => TAB_FIELDS[tab].every((k) => !errors[k]);
  const allValid = Object.keys(errors).length === 0;

  return <Ctx.Provider value={{ form, errors, bind, tabValid, allValid, touch }}>{children}</Ctx.Provider>;
}

