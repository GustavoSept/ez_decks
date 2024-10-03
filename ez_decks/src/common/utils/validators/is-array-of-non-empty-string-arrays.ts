import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validates a string[][], where no Array is empty, and there are no empty strings
 */
export function IsArrayOfNonEmptyStringArrays(validationOptions?: ValidationOptions) {
   return function (object: object, propertyName: string) {
      registerDecorator({
         name: 'isArrayOfNonEmptyStringArrays',
         target: object.constructor,
         propertyName: propertyName,
         options: validationOptions,
         validator: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            validate(value: any, _args: ValidationArguments) {
               if (!Array.isArray(value) || value.length === 0) {
                  return false;
               }
               for (const arr of value) {
                  if (!Array.isArray(arr) || arr.length === 0) {
                     return false;
                  }
                  for (const str of arr) {
                     if (typeof str !== 'string' || str.trim() === '') {
                        return false;
                     }
                  }
               }
               return true;
            },
            defaultMessage(args: ValidationArguments) {
               return `${args.property} must be an array of non-empty arrays of non-empty strings`;
            },
         },
      });
   };
}
