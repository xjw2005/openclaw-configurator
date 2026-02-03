import { select } from "@inquirer/prompts";

export const MENU_EXIT = Symbol("MENU_EXIT");

export interface MenuItem<T = unknown> {
  label: string;
  value: T | typeof MENU_EXIT;
  action?: () => Promise<void> | void;
}

export interface MenuConfig<T = unknown> {
  message: string;
  items: MenuItem<T>[];
  loop?: boolean;
}

export async function runMenu<T>(config: MenuConfig<T>): Promise<T | null> {
  const { message, items, loop = false } = config;

  const choices = items.map((item) => ({
    name: item.label,
    value: item,
  }));

  do {
    const selected = await select<MenuItem<T>>({
      message,
      choices,
    });

    if (selected.value === MENU_EXIT) {
      return null;
    }

    if (selected.action) {
      await selected.action();
    }

    if (!loop) {
      return selected.value as T;
    }

    console.log();
  } while (loop);

  return null;
}
