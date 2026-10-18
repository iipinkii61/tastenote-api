import { registerDecorator, ValidationOptions } from 'class-validator';
export function isDateOnly(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith('0000')
  )
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function IsDateOnly(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isDateOnly',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate: isDateOnly,
        defaultMessage: () =>
          `${propertyName} must be a valid date in YYYY-MM-DD format`,
      },
    });
}
