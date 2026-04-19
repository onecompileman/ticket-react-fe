import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { TicketBoardColumn } from "../../../shared/models/TicketBoardColumn";

const LIST_COLORS = [
  { label: "Sand", value: "#f4f0e2" },
  { label: "Sky", value: "#e7edf5" },
  { label: "Lavender", value: "#ece7f6" },
  { label: "Mint", value: "#e5eee6" },
  { label: "Peach", value: "#efe8dd" },
  { label: "Slate", value: "#e6e7f2" },
] as const;

const addListSchema = z.object({
  column_name: z
    .string()
    .trim()
    .min(1, "List title is required.")
    .max(100, "List title must be 100 characters or fewer."),
  color: z.enum(LIST_COLORS.map((color) => color.value) as [
    (typeof LIST_COLORS)[number]["value"],
    ...(typeof LIST_COLORS)[number]["value"][],
  ]),
});

type AddListFormValues = z.input<typeof addListSchema>;
type AddListFormSubmitValues = z.output<typeof addListSchema>;

interface AddListModalProps {
  open: boolean;
  ticketBoardColumn?: TicketBoardColumn;
  onClose: () => void;
  onCreate: (payload: AddListFormSubmitValues) => void;
}

export const AddListModal = ({ open, ticketBoardColumn, onClose, onCreate }: AddListModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddListFormValues, undefined, AddListFormSubmitValues>({
    resolver: zodResolver(addListSchema),
    defaultValues: {
      column_name: ticketBoardColumn?.column_name || "",
      color: ticketBoardColumn?.color as any || LIST_COLORS[0].value,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        column_name: "",
        color: LIST_COLORS[0].value,
      });
    }
  }, [open, reset]);

  if (!open) {
    return null;
  }

  const selectedColor = watch("color");

  const onSubmit = handleSubmit((values) => {
    onCreate(values);
    reset({
      column_name: "",
      color: LIST_COLORS[0].value,
    });
    onClose();
  });

  return (
    <div
      className="board-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-list-title"
    >
      <div className="board-modal-card add-list-modal-card">
        <div className="board-modal-head">
          <h2 id="add-list-title">Add List</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close add list modal"
          >
            X
          </button>
        </div>

        <form className="form-preview" onSubmit={onSubmit} noValidate>
          <label>
            Title
            <input
              type="text"
              className={`field field-input${errors.column_name ? " field-invalid" : ""}`}
              maxLength={100}
              placeholder="New list title"
              {...register("column_name")}
            />
            <div className="field-meta-row">
              <span className="field-hint">Required, up to 100 characters.</span>
              <span className="field-counter">{watch("column_name").length}/100</span>
            </div>
            {errors.column_name && <p className="field-error">{errors.column_name.message}</p>}
          </label>

          <label>
            Color
            <input type="hidden" {...register("color")} />
            <div className="color-picker-grid" role="radiogroup" aria-label="List color">
              {LIST_COLORS.map((color) => {
                const isSelected = selectedColor === color.value;

                return (
                  <button
                    key={color.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={color.label}
                    title={color.label}
                    className={`color-circle${isSelected ? " color-circle-selected" : ""}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() =>
                      setValue("color", color.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                );
              })}
            </div>
            {errors.color && <p className="field-error">{errors.color.message}</p>}
            <div className="list-color-preview-row">
              <span>Preview</span>
              <span
                className="list-color-preview"
                style={{ backgroundColor: selectedColor }}
                aria-hidden="true"
              />
            </div>
          </label>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting && <i className="fas fa-spinner fa-spin" />}
              Add List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
