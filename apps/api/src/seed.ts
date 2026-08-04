import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@granjamafaldo.com.br').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  let farm = await prisma.farm.findFirst({ where: { name: 'Granja Mafaldo' } });
  if (!farm) {
    farm = await prisma.farm.create({
      data: {
        name: 'Granja Mafaldo',
        document: '48.324.547/0001-79',
        city: 'Riacho da Cruz',
        state: 'RN'
      }
    });
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { farmId: farm.id, name: 'Administrador', role: Role.ADMIN, active: true }
    });
  } else {
    if (!password || password.length < 8) {
      throw new Error('Defina ADMIN_PASSWORD com pelo menos 8 caracteres para criar o primeiro administrador.');
    }
    await prisma.user.create({
      data: {
        farmId: farm.id,
        name: 'Administrador',
        email,
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash(password, 12)
      }
    });
  }

  const defaults = [
    ['vacinas', 'Newcastle'],
    ['vacinas', 'Gumboro'],
    ['vacinas', 'Bouba aviária'],
    ['vacinas', 'Bronquite infecciosa'],
    ['tarefas', 'Conferir água e ração'],
    ['tarefas', 'Realizar coleta de ovos'],
    ['tarefas', 'Inspecionar aviários']
  ];

  for (const [module, title] of defaults) {
    const exists = await prisma.entry.findFirst({ where: { farmId: farm.id, module, title } });
    if (!exists) {
      await prisma.entry.create({
        data: {
          farmId: farm.id,
          module,
          title,
          status: module === 'tarefas' ? 'OPEN' : 'ACTIVE',
          data: { origin: 'seed' }
        }
      });
    }
  }

  console.log(`Banco preparado. Administrador: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
