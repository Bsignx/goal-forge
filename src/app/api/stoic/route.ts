import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Daily questions rotation
const STOIC_QUESTIONS = [
  "O que eu controlei hoje?",
  "Onde reagi mal?",
  "O que fiz apesar da vontade?",
];

// Stoic quotes collection
const STOIC_QUOTES = [
  { text: "Não são as coisas que nos perturbam, mas sim a opinião que temos delas.", author: "Epiteto" },
  { text: "Sofres mais na imaginação do que na realidade.", author: "Sêneca" },
  { text: "A felicidade da sua vida depende da qualidade dos seus pensamentos.", author: "Marco Aurélio" },
  { text: "Não temos controle sobre eventos externos, apenas sobre nossas reações a eles.", author: "Epiteto" },
  { text: "Não é o homem que tem pouco, mas o homem que deseja mais, que é pobre.", author: "Sêneca" },
  { text: "Quando você acordar de manhã, diga a si mesmo: as pessoas com quem lido hoje serão intrometidas, ingratas, arrogantes, desonestas, invejosas e hostis.", author: "Marco Aurélio" },
  { text: "A melhor vingança é não ser como o seu inimigo.", author: "Marco Aurélio" },
  { text: "Quem vive em harmonia consigo mesmo vive em harmonia com o universo.", author: "Marco Aurélio" },
  { text: "O impedimento para a ação avança a ação. O que está no caminho se torna o caminho.", author: "Marco Aurélio" },
  { text: "Não perca mais tempo discutindo o que um bom homem deveria ser. Seja um.", author: "Marco Aurélio" },
  { text: "A dificuldade mostra o que os homens são.", author: "Epiteto" },
  { text: "Primeiro diga a si mesmo o que você seria; e então faça o que você precisa fazer.", author: "Epiteto" },
  { text: "Nenhum homem é livre se não é senhor de si mesmo.", author: "Epiteto" },
  { text: "Se um homem sabe para onde está navegando, qualquer vento é o vento certo.", author: "Sêneca" },
  { text: "Às vezes, mesmo viver é um ato de coragem.", author: "Sêneca" },
  { text: "Sorte é o que acontece quando a preparação encontra a oportunidade.", author: "Sêneca" },
  { text: "Enquanto vivemos, enquanto estamos entre os seres humanos, cultivemos nossa humanidade.", author: "Sêneca" },
  { text: "Se não está em seu poder mudar algo, não desperdice sua energia com isso.", author: "Sêneca" },
  { text: "Você tem poder sobre sua mente, não sobre eventos externos. Perceba isso e encontrará força.", author: "Marco Aurélio" },
  { text: "Não deixe que o comportamento dos outros destrua sua paz interior.", author: "Dalai Lama" },
  { text: "A vida é longa o suficiente, e uma quantia suficientemente generosa foi dada a nós para as maiores realizações.", author: "Sêneca" },
  { text: "Quanto mais nos valoramos, menos somos afetados pelo que os outros pensam de nós.", author: "Epiteto" },
  { text: "O homem sábio é aquele que não sofre pela falta do que não tem, mas se alegra com o que tem.", author: "Epiteto" },
  { text: "Faça cada ato da sua vida como se fosse o último.", author: "Marco Aurélio" },
  { text: "A alma se torna tingida pela cor dos seus pensamentos.", author: "Marco Aurélio" },
  { text: "Se é endurável, então aguente. Pare de reclamar.", author: "Marco Aurélio" },
  { text: "Recebemos os males que infligimos a nós mesmos com mais leveza do que os que nos são feitos por outros.", author: "Sêneca" },
  { text: "Ninguém pode fazer você se sentir inferior sem o seu consentimento.", author: "Eleanor Roosevelt" },
  { text: "O objetivo da vida não é estar do lado da maioria, mas escapar de se encontrar nas fileiras dos insanos.", author: "Marco Aurélio" },
  { text: "Comece de manhã dizendo a si mesmo: encontrarei um intrometido, um ingrato, um homem violento, um traidor, um invejoso.", author: "Marco Aurélio" },
  { text: "A riqueza consiste não em ter grandes posses, mas em ter poucas necessidades.", author: "Epiteto" },
];

// Get daily quote based on date (different each day)
function getDailyQuote(date: Date): { text: string; author: string } {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return STOIC_QUOTES[dayOfYear % STOIC_QUOTES.length];
}

// Get daily question based on date
function getDailyQuestion(date: Date): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return STOIC_QUESTIONS[dayOfYear % STOIC_QUESTIONS.length];
}

// GET today's stoic entry
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const entry = await prisma.stoicEntry.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
  });

  const question = getDailyQuestion(today);
  const quote = getDailyQuote(today);

  return NextResponse.json({
    entry,
    question,
    quote,
  });
}

// POST/UPDATE today's stoic entry
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { answer } = await request.json();

  if (!answer || typeof answer !== "string") {
    return NextResponse.json({ error: "Answer is required" }, { status: 400 });
  }

  // Enforce 300 character limit
  if (answer.length > 300) {
    return NextResponse.json(
      { error: "Answer must be 300 characters or less" },
      { status: 400 },
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const question = getDailyQuestion(today);

  const entry = await prisma.stoicEntry.upsert({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
    create: {
      userId: session.user.id,
      date: today,
      question,
      answer,
    },
    update: {
      answer,
    },
  });

  return NextResponse.json(entry);
}
