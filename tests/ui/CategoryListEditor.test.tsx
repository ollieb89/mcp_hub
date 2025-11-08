import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import CategoryListEditor from "@components/CategoryListEditor";

describe("CategoryListEditor", () => {
  const defaultProps = {
    categories: ["github", "filesystem"],
    onChange: vi.fn(),
  };

  it("renders with default title", () => {
    render(<CategoryListEditor {...defaultProps} />);
    expect(screen.getByText("Allowed Categories")).toBeInTheDocument();
  });

  it("renders with custom title", () => {
    render(<CategoryListEditor {...defaultProps} title="Custom Title" />);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });

  it("displays helper text when provided", () => {
    const helperText = "Add categories to filter tools";
    render(<CategoryListEditor {...defaultProps} helperText={helperText} />);
    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  it("displays existing categories as chips", () => {
    render(<CategoryListEditor {...defaultProps} />);
    expect(screen.getByText("github")).toBeInTheDocument();
    expect(screen.getByText("filesystem")).toBeInTheDocument();
  });

  it("shows empty state when no categories", () => {
    render(<CategoryListEditor categories={[]} onChange={vi.fn()} />);
    expect(
      screen.getByText(/No categories defined/i)
    ).toBeInTheDocument();
  });

  it("adds a new category when clicking Add button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor categories={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);
    await user.type(input, "web");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(onChange).toHaveBeenCalledWith(["web"]);
  });

  it("adds category when pressing Enter key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor categories={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);
    await user.type(input, "docker{Enter}");

    expect(onChange).toHaveBeenCalledWith(["docker"]);
  });

  it("clears input when pressing Escape key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor categories={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i) as HTMLInputElement;
    await user.type(input, "test{Escape}");

    expect(input.value).toBe("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("converts category names to lowercase", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor categories={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);
    await user.type(input, "GitHub");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(onChange).toHaveBeenCalledWith(["github"]);
  });

  it("shows error for duplicate categories", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor {...defaultProps} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);
    await user.type(input, "github");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows error for empty category name", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor categories={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(await screen.findByText(/cannot be empty/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("validates category name format", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor categories={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);
    await user.type(input, "invalid-name");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(
      await screen.findByText(/lowercase letters, numbers, and underscores/i)
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("accepts valid category names with underscores and numbers", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor categories={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);
    await user.type(input, "vertex_ai_v2");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(onChange).toHaveBeenCalledWith(["vertex_ai_v2"]);
  });

  it("clears error when user starts typing again", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor {...defaultProps} onChange={onChange} />);

    const input = screen.getByLabelText(/category name input/i);

    // Trigger error
    await user.type(input, "github");
    await user.click(screen.getByRole("button", { name: /add category/i }));
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();

    // Start typing again
    await user.clear(input);
    await user.type(input, "w");

    await waitFor(() => {
      expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
    });
  });

  it("disables Add button when input is empty", async () => {
    render(<CategoryListEditor categories={[]} onChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: /add category/i });
    expect(button).toBeDisabled();
  });

  it("enables Add button when input has value", async () => {
    const user = userEvent.setup();
    render(<CategoryListEditor categories={[]} onChange={vi.fn()} />);

    const input = screen.getByLabelText(/category name input/i);
    const button = screen.getByRole("button", { name: /add category/i });

    await user.type(input, "test");
    expect(button).toBeEnabled();
  });

  it("removes category when clicking chip delete button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryListEditor {...defaultProps} onChange={onChange} />);

    const chip = screen.getByText("github").closest(".MuiChip-root");
    const deleteButton = chip?.querySelector(".MuiChip-deleteIcon");

    if (deleteButton) {
      await user.click(deleteButton);
      expect(onChange).toHaveBeenCalledWith(["filesystem"]);
    }
  });

  it("has proper ARIA labels for accessibility", () => {
    render(<CategoryListEditor {...defaultProps} />);

    expect(screen.getByLabelText(/category name input/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add category/i })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /category list/i })).toBeInTheDocument();
  });

  it("shows keyboard shortcuts hint in helper text", () => {
    render(<CategoryListEditor categories={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/Press Enter to add, Escape to clear/i)).toBeInTheDocument();
  });
});
