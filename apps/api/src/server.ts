import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = express();
const secret = process.env.JWT_SECRET || 'troque-esta-chave';
const origins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(x => x.trim());
const modules = new Set(['aviarios','lotes','ficha-diaria','coleta-ovos','vacinas','vacinacoes','sanidade','estoque','movimentacoes','compras','fornecedores','clientes','vendas','gastos','tarefas','manutencoes','visitantes','ambiencia','documentos']);

type Session = { id:string; farmId:string; role:Role; name:string };
declare global { namespace Express { interface Request { session?: Session } } }
const wrap = (fn:any) => (req:any,res:any,next:any) => Promise.resolve(fn(req,res,next)).catch(next);
const auth = wrap(async (req:any,res:any,next:any) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/,'');
  if (!token) return res.status(401).json({message:'Não autenticado.'});
  try { req.session = jwt.verify(token, secret) as Session; next(); }
  catch { res.status(401).json({message:'Sessão inválida.'}); }
});
const allow = (...roles:Role[]) => (req:any,res:any,next:any) => roles.includes(req.session.role) ? next() : res.status(403).json({message:'Sem permissão.'});
const validateModule = (req:any,res:any,next:any) => modules.has(req.params.module) ? next() : res.status(404).json({message:'Módulo inválido.'});
const audit = (req:any,action:string,entity:string,id?:string,payload?:any) => prisma.audit.create({data:{farmId:req.session.farmId,userId:req.session.id,action,entity,entityId:id,payload}});

app.use(helmet());
app.use(cors({origin:origins,credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use('/api', rateLimit({windowMs:60_000,max:180}));
app.get('/api/health', wrap(async (_req:any,res:any) => { await prisma.$queryRaw`SELECT 1`; res.json({ok:true,service:'granja-mafaldo-api'}); }));
app.post('/api/auth/login', wrap(async (req:any,res:any) => {
  const body = z.object({email:z.string().email(),password:z.string().min(6)}).parse(req.body);
  const user = await prisma.user.findUnique({where:{email:body.email.toLowerCase()},include:{farm:true}});
  if (!user || !user.active || !(await bcrypt.compare(body.password,user.passwordHash))) return res.status(401).json({message:'E-mail ou senha inválidos.'});
  const session:Session = {id:user.id,farmId:user.farmId,role:user.role,name:user.name};
  res.json({token:jwt.sign(session,secret,{expiresIn:'12h'}),user:{id:user.id,name:user.name,email:user.email,role:user.role},farm:user.farm});
}));
app.get('/api/me',auth,wrap(async(req:any,res:any)=>res.json(await prisma.user.findUnique({where:{id:req.session.id},select:{id:true,name:true,email:true,role:true,farm:true}}))));

app.get('/api/dashboard',auth,wrap(async(req:any,res:any)=>{
  const farmId=req.session.farmId; const today=new Date(); today.setHours(0,0,0,0); const month=new Date(today.getFullYear(),today.getMonth(),1);
  const [lots,eggs,daily,sales,expenses,stock,vaccines,tasks]=await Promise.all([
    prisma.entry.findMany({where:{farmId,module:'lotes',status:'ACTIVE'},orderBy:{createdAt:'desc'}}),
    prisma.entry.findMany({where:{farmId,module:'coleta-ovos',date:{gte:today}}}),
    prisma.entry.findMany({where:{farmId,module:'ficha-diaria',date:{gte:today}}}),
    prisma.entry.aggregate({where:{farmId,module:'vendas',date:{gte:month},status:{not:'CANCELLED'}},_sum:{amount:true}}),
    prisma.entry.aggregate({where:{farmId,module:'gastos',date:{gte:month},status:{not:'CANCELLED'}},_sum:{amount:true}}),
    prisma.entry.findMany({where:{farmId,module:'estoque'},orderBy:{quantity:'asc'},take:8}),
    prisma.entry.findMany({where:{farmId,module:'vacinacoes',date:{gte:today},status:'SCHEDULED'},orderBy:{date:'asc'},take:8}),
    prisma.entry.findMany({where:{farmId,module:'tarefas',status:{not:'DONE'}},orderBy:{date:'asc'},take:8})
  ]);
  const birds=lots.reduce((sum,x)=>sum+Number(x.quantity||0),0);
  const totalEggs=eggs.reduce((sum,x)=>sum+Number(x.quantity||0),0);
  const saleableEggs=eggs.reduce((sum,x)=>sum+Number((x.data as any)?.saleableEggs||0),0);
  const feedKg=daily.reduce((sum,x)=>sum+Number((x.data as any)?.feedKg||0),0);
  const mortality=daily.reduce((sum,x)=>sum+Number((x.data as any)?.mortality||0),0);
  res.json({kpis:{birds,totalEggs,saleableEggs,layRate:birds?Number((totalEggs/birds*100).toFixed(1)):0,feedKg,mortality,revenue:Number(sales._sum.amount||0),expenses:Number(expenses._sum.amount||0)},lots,stock,vaccines,tasks});
}));

app.get('/api/data/:module',auth,validateModule,wrap(async(req:any,res:any)=>{
  const q=String(req.query.q||'');
  res.json(await prisma.entry.findMany({where:{farmId:req.session.farmId,module:req.params.module,...(q?{title:{contains:q,mode:'insensitive'}}:{})},orderBy:[{date:'desc'},{createdAt:'desc'}],take:500}));
}));
app.post('/api/data/:module',auth,validateModule,allow(Role.ADMIN,Role.MANAGER,Role.WORKER,Role.VET),wrap(async(req:any,res:any)=>{
  const b=z.object({title:z.string().min(1),date:z.string().optional().nullable(),status:z.string().optional().nullable(),quantity:z.any().optional(),amount:z.any().optional(),referenceId:z.string().optional().nullable(),data:z.record(z.string(),z.any()).default({})}).parse(req.body);
  const entry=await prisma.entry.create({data:{farmId:req.session.farmId,module:req.params.module,title:b.title,date:b.date?new Date(b.date):null,status:b.status||null,quantity:b.quantity===''||b.quantity==null?null:Number(b.quantity),amount:b.amount===''||b.amount==null?null:Number(b.amount),referenceId:b.referenceId||null,data:b.data}});
  await audit(req,'CREATE',req.params.module,entry.id,b); res.status(201).json(entry);
}));
app.put('/api/data/:module/:id',auth,validateModule,allow(Role.ADMIN,Role.MANAGER,Role.VET),wrap(async(req:any,res:any)=>{
  const current=await prisma.entry.findFirst({where:{id:req.params.id,farmId:req.session.farmId,module:req.params.module}}); if(!current)return res.status(404).json({message:'Registro não encontrado.'});
  const b=req.body; const entry=await prisma.entry.update({where:{id:current.id},data:{title:b.title,date:b.date?new Date(b.date):null,status:b.status||null,quantity:b.quantity===''||b.quantity==null?null:Number(b.quantity),amount:b.amount===''||b.amount==null?null:Number(b.amount),referenceId:b.referenceId||null,data:b.data||{}}});
  await audit(req,'UPDATE',req.params.module,entry.id,b); res.json(entry);
}));
app.delete('/api/data/:module/:id',auth,validateModule,allow(Role.ADMIN,Role.MANAGER),wrap(async(req:any,res:any)=>{
  const current=await prisma.entry.findFirst({where:{id:req.params.id,farmId:req.session.farmId,module:req.params.module}}); if(!current)return res.status(404).json({message:'Registro não encontrado.'});
  await prisma.entry.delete({where:{id:current.id}}); await audit(req,'DELETE',req.params.module,current.id); res.status(204).end();
}));

app.get('/api/farm',auth,wrap(async(req:any,res:any)=>res.json(await prisma.farm.findUnique({where:{id:req.session.farmId}}))));
app.put('/api/farm',auth,allow(Role.ADMIN,Role.MANAGER),wrap(async(req:any,res:any)=>res.json(await prisma.farm.update({where:{id:req.session.farmId},data:req.body}))));
app.get('/api/users',auth,allow(Role.ADMIN,Role.MANAGER),wrap(async(req:any,res:any)=>res.json(await prisma.user.findMany({where:{farmId:req.session.farmId},select:{id:true,name:true,email:true,role:true,active:true,createdAt:true}}))));
app.post('/api/users',auth,allow(Role.ADMIN),wrap(async(req:any,res:any)=>{
  const b=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),role:z.nativeEnum(Role)}).parse(req.body);
  const u=await prisma.user.create({data:{farmId:req.session.farmId,name:b.name,email:b.email.toLowerCase(),passwordHash:await bcrypt.hash(b.password,12),role:b.role}}); res.status(201).json({id:u.id,name:u.name,email:u.email,role:u.role});
}));
app.get('/api/reports/:module.csv',auth,validateModule,wrap(async(req:any,res:any)=>{
  const rows=await prisma.entry.findMany({where:{farmId:req.session.farmId,module:req.params.module},orderBy:{date:'desc'},take:5000});
  const csv=['Título;Data;Status;Quantidade;Valor;Detalhes',...rows.map(r=>[r.title,r.date?.toISOString()||'',r.status||'',r.quantity??'',r.amount??'',JSON.stringify(r.data)].map(v=>`"${String(v).replaceAll('"','""')}"`).join(';'))].join('\n');
  res.setHeader('Content-Disposition',`attachment; filename=${req.params.module}.csv`); res.type('text/csv').send(csv);
}));
app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);res.status(err?.name==='ZodError'?400:500).json({message:err?.name==='ZodError'?'Dados inválidos.':'Erro interno.'});});
app.listen(Number(process.env.PORT||3333),'0.0.0.0',()=>console.log('API Granja Mafaldo ativa'));
