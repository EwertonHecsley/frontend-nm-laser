"use client";

import { Check, ChevronsUpDown, Loader2, UserRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCpf } from "@/features/patients/utils";
import { useApiQuery, useDebouncedValue } from "@/hooks";
import { patientsService } from "@/services";
import { cn } from "cn";

interface PatientComboboxProps {
  id?: string;
  value: string;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (patientId: string) => void;
}

export function PatientCombobox({
  id,
  value,
  invalid,
  disabled,
  onChange,
}: PatientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query, 300).trim();

  const { data: results, isLoading: isSearching } = useApiQuery(
    (signal) =>
      patientsService.list(
        { page: 1, limit: 20, search: search || undefined },
        { signal },
      ),
    `appointment-patient-search:${search}`,
    { enabled: open },
  );

  const { data: selectedPatient } = useApiQuery(
    (signal) => patientsService.getById(value, { signal }),
    `appointment-patient:${value}`,
    { enabled: Boolean(value) },
  );

  const options = results?.data ?? [];
  const label = value
    ? (selectedPatient?.fullName ?? "Paciente selecionada")
    : "Selecione a paciente";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className="h-11 w-full justify-between px-3 font-normal"
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2",
              !value && "text-muted-foreground",
            )}
          >
            <UserRound className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar por nome ou CPF"
          />
          <CommandList>
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando…
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={() => {
                      onChange(patient.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        patient.id === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {patient.fullName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        CPF {formatCpf(patient.cpf)}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
