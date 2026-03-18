import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@novel-api.com' },
    update: {},
    create: {
      email: 'admin@novel-api.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log('✅ Created admin user:', admin.username);

  // Create test user
  const userPassword = await bcrypt.hash('User123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@novel-api.com' },
    update: {},
    create: {
      email: 'user@novel-api.com',
      username: 'testuser',
      password: userPassword,
      role: 'USER',
      isVerified: true,
    },
  });
  console.log('✅ Created test user:', user.username);

  // Create genres
  const genres = await Promise.all([
    prisma.genre.upsert({
      where: { slug: 'fantasy' },
      update: {},
      create: { name: 'Fantasy', slug: 'fantasy' },
    }),
    prisma.genre.upsert({
      where: { slug: 'romance' },
      update: {},
      create: { name: 'Romance', slug: 'romance' },
    }),
    prisma.genre.upsert({
      where: { slug: 'action' },
      update: {},
      create: { name: 'Action', slug: 'action' },
    }),
    prisma.genre.upsert({
      where: { slug: 'mystery' },
      update: {},
      create: { name: 'Mystery', slug: 'mystery' },
    }),
    prisma.genre.upsert({
      where: { slug: 'sci-fi' },
      update: {},
      create: { name: 'Sci-Fi', slug: 'sci-fi' },
    }),
  ]);
  console.log('✅ Created', genres.length, 'genres');

  // Create sample novel
  const novel = await prisma.novel.upsert({
    where: { slug: 'the-beginning-after-the-end' },
    update: {},
    create: {
      title: 'The Beginning After The End',
      slug: 'the-beginning-after-the-end',
      synopsis: 'King Grey has unrivaled strength, wealth, and prestige in a world governed by martial ability. However, solitude lingers closely behind those with great power. Beneath the glamorous exterior of a powerful king lurks the shell of a man, devoid of purpose and will.',
      status: 'ONGOING',
      authorId: admin.id,
      publishedAt: new Date(),
      genres: {
        create: [
          { genreId: genres[0].id }, // Fantasy
          { genreId: genres[2].id }, // Action
        ],
      },
    },
  });
  console.log('✅ Created sample novel:', novel.title);

  // Create sample chapters
  const chapters = await Promise.all([
    prisma.chapter.upsert({
      where: { novelId_chapterNum: { novelId: novel.id, chapterNum: 1 } },
      update: {},
      create: {
        title: 'The Fall of a King',
        chapterNum: 1,
        content: `Chapter 1: The Fall of a King

The grand hall of the royal palace was silent, save for the soft footsteps of King Grey as he made his way toward the throne. His advisors had long since retired for the night, leaving him alone with his thoughts—the only company he had kept for years.

At just thirty years old, he had unified the entire continent under his rule. His martial prowess was unmatched, his strategic genius unparalleled. Yet as he sat upon his throne, staring at the empty hall, he felt nothing but a hollow ache in his chest.

"Is this it?" he whispered to the silence. "Is this all there is?"

Power. Wealth. Prestige. He had achieved everything a person could possibly dream of. And yet...

The attack came without warning. A blade of pure white light pierced through his chest, and King Grey's eyes widened in shock. He hadn't sensed the assassin's presence at all.

As his vision faded, the last thing he saw was a figure cloaked in white, its face obscured by a mask.

"Interesting," the figure spoke. "You seem... relieved."

And then, darkness.

...

When Grey opened his eyes again, he found himself in a small, unfamiliar room. The ceiling was low, the walls made of rough wood. And in his arms...

A baby.

His baby.

Memories flooded his mind—memories that weren't his. Arthur Leywin. That was his name now. A newborn in a world unlike any he had known.

"A second chance," he realized, his infant voice coming out as a gurgle. "A chance to live a life with purpose."

The Beginning After The End had commenced.`,
        novelId: novel.id,
        wordCount: 300,
      },
    }),
    prisma.chapter.upsert({
      where: { novelId_chapterNum: { novelId: novel.id, chapterNum: 2 } },
      update: {},
      create: {
        title: 'A New World',
        chapterNum: 2,
        content: `Chapter 2: A New World

Years passed, and Arthur—formerly King Grey—grew into an exceptional child. By age four, he had already begun practicing mana manipulation, a fundamental skill in this world of magic.

His father, Reynolds Leywin, was a former adventurer who had retired to become a guard in the town of Xyrus. His mother, Alice, was a talented mage who had given up her career to raise her family.

They loved their son deeply, though they sometimes wondered about his unusually mature behavior. A four-year-old who meditated, read books with startling comprehension, and spoke with a vocabulary far beyond his years.

"Arthur, honey," Alice called one morning, "are you ready for your lessons?"

The young boy looked up from his book, his sharp eyes meeting his mother's warm gaze.

"Yes, Mother," he replied with a smile that, while rare, was always genuine.

This world, this life—it was everything his previous existence had lacked. Here, he had a family. He had love. He had purpose.

And he would do anything to protect it.`,
        novelId: novel.id,
        wordCount: 200,
      },
    }),
  ]);
  console.log('✅ Created', chapters.length, 'chapters');

  // Update novel total chapters
  await prisma.novel.update({
    where: { id: novel.id },
    data: { totalChapters: chapters.length },
  });

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
