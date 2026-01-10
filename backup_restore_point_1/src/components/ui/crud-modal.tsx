import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

interface CrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSave: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

export function CrudModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  onDelete,
  isEditing = false,
}: CrudModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-4">{children}</div>
        <DialogFooter className="flex gap-2">
          {isEditing && onDelete && (
            <Button variant="destructive" onClick={onDelete} className="mr-auto">
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FormFieldProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  children?: ReactNode;
}

export function FormField({ label, value, onChange, placeholder, type = "text", children }: FormFieldProps) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right text-sm">{label}</Label>
      {children ? (
        <div className="col-span-3">{children}</div>
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="col-span-3"
        />
      )}
    </div>
  );
}
