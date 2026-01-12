# Beer Pong Management App

This is a Next.js project designed to manage beer pong tournaments for a close-knit group of friends, providing features for player management, tournament scheduling, and live updates.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Operational Notes

This project is deployed and actively used by a friends group. Please observe the following:

-   **Agent Guidelines:** For AI agents interacting with this repository, please consult the [agent.md](agent.md) file for critical operational constraints and best practices, especially regarding database interaction.
-   **Deployment Process:** On the production server, the deployment process typically involves:
    1.  `git pull` (to fetch latest changes, ensuring local changes are stashed or committed first if necessary).
    2.  `npm install` (to update dependencies).
    3.  `npx prisma migrate deploy` (to apply database migrations safely).
    4.  `npm run build` (to rebuild the application).
    5.  `pm2 restart beer-pong` (to restart the application service).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.