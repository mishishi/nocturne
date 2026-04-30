/**
 * Seed Script: Create Admin User
 *
 * Usage:
 *   1. Register a new user via the app (phone + password)
 *   2. Run this script with the user's openid:
 *      node prisma/seed-admin.js <openid>
 *
 * Example:
 *   node prisma/seed-admin.js oABC123DEF456
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const openid = process.argv[2]

  if (!openid) {
    console.error('Usage: node prisma/seed-admin.js <openid>')
    console.error('Example: node prisma/seed-admin.js oABC123DEF456')
    process.exit(1)
  }

  try {
    // Find user by openid
    const user = await prisma.user.findUnique({
      where: { openid }
    })

    if (!user) {
      console.error(`User not found with openid: ${openid}`)
      process.exit(1)
    }

    console.log(`Found user: ${user.nickname || 'Unknown'} (${user.openid})`)
    console.log(`Current isAdmin: ${user.isAdmin}`)

    // Update to admin
    const updated = await prisma.user.update({
      where: { openid },
      data: { isAdmin: true }
    })

    console.log(`\nSuccessfully updated!`)
    console.log(`New isAdmin: ${updated.isAdmin}`)
    console.log(`\nYou can now access /admin routes with this user's token.`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
