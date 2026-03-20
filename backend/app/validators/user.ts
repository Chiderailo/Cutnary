import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup.
 * Accepts "name" or "fullName" for the user's display name.
 */
export const signupValidator = vine.compile(
  vine.object({
    name: vine.string().optional(),
    fullName: vine.string().optional(),
    email: email().unique({ table: 'users', column: 'email' }),
    password: password(),
    passwordConfirmation: password().sameAs('password'),
  })
)

/**
 * Validator to use before validating user credentials during login
 */
export const loginValidator = vine.compile(
  vine.object({
    email: email(),
    password: vine.string(),
  })
)
