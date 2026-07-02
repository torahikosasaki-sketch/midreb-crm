"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { PHASES, PHASE_COLORS, formatYen, parseServices, type Phase } from "@/lib/enums";
import { moveDeal } from "@/lib/actions/deals";
import type { DealCard } from "@/lib/types";

type Grouped = Record<string, DealCard[]>;

function group(deals: DealCard[]): Grouped {
  const g: Grouped = {};
  for (const p of PHASES) g[p] = [];
  for (const d of deals) {
    (g[d.phase] ??= []).push(d);
  }
  for (const p of Object.keys(g)) g[p].sort((a, b) => a.position - b.position);
  return g;
}

export function KanbanBoard({ deals }: { deals: DealCard[] }) {
  const [grouped, setGrouped] = useState<Grouped>(() => group(deals));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // dnd-kit は内部 id カウンタの都合で SSR とクライアントで属性が食い違う。
  // クライアントマウント後にのみ DnD レイヤーを有効化してハイドレーション不一致を防ぐ。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const allCards = Object.values(grouped).flat();
  const activeCard = allCards.find((d) => d.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dealId = String(active.id);
    const targetPhase = String(over.id) as Phase;
    const fromPhase = active.data.current?.phase as string | undefined;
    if (!fromPhase || fromPhase === targetPhase) return;

    // 楽観的更新
    setGrouped((prev) => {
      const next: Grouped = {};
      for (const k of Object.keys(prev)) next[k] = [...prev[k]];
      const idx = next[fromPhase].findIndex((d) => d.id === dealId);
      if (idx === -1) return prev;
      const [card] = next[fromPhase].splice(idx, 1);
      const updated: DealCard = {
        ...card,
        phase: targetPhase,
        position: next[targetPhase].length,
      };
      next[targetPhase].push(updated);
      return next;
    });

    startTransition(() => {
      moveDeal(dealId, targetPhase, grouped[targetPhase].length);
    });
  }

  const grandTotal = allCards
    .filter((d) => d.phase !== "失注" && d.phase !== "保留")
    .reduce((s, d) => s + d.weightedRevenue, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-slate-500">パイプライン加重売上合計</span>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums">
            {formatYen(grandTotal)}
          </span>
          <span className="text-xs text-slate-400">（失注・保留を除く / 月間）</span>
        </div>
        <Link
          href="/deals/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          ＋ 商談を追加
        </Link>
      </div>

      {mounted ? (
        <DndContext
          id="kanban-board"
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 min-h-0 overflow-x-auto thin-scroll">
            <div className="flex gap-3 p-4 h-full min-w-max">
              {PHASES.map((phase) => (
                <Column key={phase} phase={phase} cards={grouped[phase] ?? []} draggable />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeCard ? <CardBody card={activeCard} overlay /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto thin-scroll">
          <div className="flex gap-3 p-4 h-full min-w-max">
            {PHASES.map((phase) => (
              <Column key={phase} phase={phase} cards={grouped[phase] ?? []} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Column({
  phase,
  cards,
  draggable = false,
}: {
  phase: Phase;
  cards: DealCard[];
  draggable?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase, disabled: !draggable });
  const total = cards.reduce((s, c) => s + c.weightedRevenue, 0);
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
        <span className={`h-2.5 w-2.5 rounded-full ${PHASE_COLORS[phase]}`} />
        <span className="font-semibold text-sm">{phase}</span>
        <span className="text-xs text-slate-400">{cards.length}</span>
        <span className="ml-auto text-xs font-medium text-slate-500 tabular-nums">
          {formatYen(total)}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-24 space-y-2 p-2 overflow-y-auto thin-scroll transition-colors ${
          isOver ? "bg-emerald-50" : ""
        }`}
      >
        {cards.map((card) =>
          draggable ? (
            <DraggableCard key={card.id} card={card} />
          ) : (
            <CardBody key={card.id} card={card} />
          )
        )}
        {cards.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-6">なし</p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ card }: { card: DealCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { phase: card.phase },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      <CardBody card={card} />
    </div>
  );
}

function CardBody({ card, overlay }: { card: DealCard; overlay?: boolean }) {
  return (
    <div
      className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm ${
        overlay ? "rotate-2 shadow-lg cursor-grabbing" : "cursor-grab hover:border-emerald-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm leading-tight">
          {card.accountName ?? "(顧客未設定)"}
        </span>
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
          {card.businessType}
        </span>
      </div>
      {card.services && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {parseServices(card.services).slice(0, 3).map((s) => (
            <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">確度 {Math.round(card.probability * 100)}%</span>
        <span className="font-semibold text-slate-800 tabular-nums">
          {formatYen(card.weightedRevenue)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{card.owner ?? "—"}</span>
        <Link
          href={`/deals/${card.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-emerald-600 hover:underline"
        >
          詳細
        </Link>
      </div>
    </div>
  );
}
