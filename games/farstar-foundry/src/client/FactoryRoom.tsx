import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Boxes,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  ClipboardList,
  Clock3,
  Copy,
  Factory,
  FlaskConical,
  Gauge,
  Hammer,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Minus,
  PackageOpen,
  Pickaxe,
  Play,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  MANUAL_GATHER_AMOUNT,
  MANUAL_GATHER_DURATION_MS,
  COMPLETED_MISSION_STAGE,
  PRODUCTION_LINE_DEFINITIONS,
  RESOURCE_BY_ID,
  RESOURCE_DEFINITIONS,
  RESOURCE_IDS,
  SPECIALIZATION_BY_ID,
  SPECIALIZATION_DEFINITIONS,
  TECHNOLOGY_BY_ID,
  TECHNOLOGY_DEFINITIONS,
  isProductionLineUnlocked,
  isResourceUnlocked,
  isTechnologyVisible,
  type LineCategory,
  type ResourceId,
} from '../shared/catalog';
import type {
  ActionResult,
  ChatMessage,
  FactorySnapshot,
  ProductionLineTuple,
  RoomView,
} from '../shared/protocol';
import type { FactoryCommandInput } from './hooks/useFoundrySocket';
import { GameIcon } from './GameIcon';

type FactoryTab = 'overview' | 'production' | 'research' | 'team';

interface FactoryRoomProps {
  accountId: string;
  connected: boolean;
  room: RoomView;
  factory: FactorySnapshot | null;
  error: string | null;
  onClearError: () => void;
  onLeave: () => void;
  onStart: () => Promise<ActionResult<RoomView>>;
  onCommand: (command: FactoryCommandInput) => Promise<ActionResult<{ sequence: number }>>;
  onChat: (text: string) => Promise<ActionResult>;
}

export function FactoryRoom(props: FactoryRoomProps) {
  const [tab, setTab] = useState<FactoryTab>('production');
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isHost = props.room.hostId === props.accountId;

  const runCommand = async (key: string, command: FactoryCommandInput) => {
    setPending(key);
    setActionError(null);
    props.onClearError();
    const result = await props.onCommand(command);
    if (!result.ok) setActionError(result.error ?? '工厂操作失败');
    setPending(null);
  };

  const start = async () => {
    setPending('start');
    setActionError(null);
    const result = await props.onStart();
    if (!result.ok) setActionError(result.error ?? '无法启动任务');
    setPending(null);
  };

  return (
    <div className="factory-shell">
      <FactoryHeader room={props.room} connected={props.connected} onLeave={props.onLeave} />
      {(actionError || props.error) && (
        <button className="factory-alert" type="button" onClick={() => { setActionError(null); props.onClearError(); }}>
          <span>{actionError ?? props.error}</span><span>关闭</span>
        </button>
      )}

      {props.room.phase === 'waiting' ? (
        <WaitingRoom
          room={props.room}
          accountId={props.accountId}
          isHost={isHost}
          pending={pending === 'start'}
          connected={props.connected}
          onStart={() => void start()}
          onChat={props.onChat}
        />
      ) : props.factory ? (
        <>
          <MissionBand factory={props.factory} onLaunch={() => void runCommand('launch', { type: 'launch' })} pending={pending === 'launch'} />
          <FactoryNavigation tab={tab} onChange={setTab} />
          <main className="factory-workspace">
            <InventoryShelf factory={props.factory} />
            <section className="factory-tab-content">
              {tab === 'overview' && <OverviewTab factory={props.factory} />}
              {tab === 'production' && <ProductionTab accountId={props.accountId} room={props.room} factory={props.factory} pending={pending} onCommand={(key, command) => void runCommand(key, command)} />}
              {tab === 'research' && <ResearchTab factory={props.factory} pending={pending} onCommand={(key, command) => void runCommand(key, command)} />}
              {tab === 'team' && <TeamTab room={props.room} accountId={props.accountId} pending={pending} onCommand={(key, command) => void runCommand(key, command)} onChat={props.onChat} />}
            </section>
          </main>
          <FactoryStatusBar room={props.room} factory={props.factory} />
        </>
      ) : (
        <main className="boot-screen"><RefreshCw className="spin" /><span>正在同步工厂状态</span></main>
      )}
    </div>
  );
}

function FactoryHeader({ room, connected, onLeave }: { room: RoomView; connected: boolean; onLeave: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };
  return (
    <header className="factory-header">
      <div className="foundry-brand compact">
        <span className="foundry-mark"><Factory /></span>
        <div><strong>远星工造</strong><small>FARSTAR FOUNDRY</small></div>
      </div>
      <div className="factory-title">
        <strong>{room.name}</strong>
        <button type="button" onClick={() => void copyCode()} title="复制房间号"><span>{room.code}</span>{copied ? <Check /> : <Copy />}</button>
        {room.hasPassword && <LockKeyhole aria-label="密码房间" />}
      </div>
      <div className="factory-header-status">
        <span className={`connection-light ${connected ? 'is-online' : ''}`}><Radio />{connected ? '在线' : '重连中'}</span>
        <span><Users />{room.members.filter((member) => member.connected).length}/{room.members.length}</span>
        <button className="icon-button" type="button" title="离开房间" aria-label="离开房间" onClick={onLeave}><LogOut /></button>
      </div>
    </header>
  );
}

function WaitingRoom(props: {
  room: RoomView;
  accountId: string;
  isHost: boolean;
  pending: boolean;
  connected: boolean;
  onStart: () => void;
  onChat: (text: string) => Promise<ActionResult>;
}) {
  return (
    <main className="waiting-workspace">
      <section className="waiting-main">
        <header className="waiting-heading">
          <span>OPERATION STAGING</span>
          <h1>协作组已建立</h1>
          <p>{props.room.name} · {props.room.members.length}/{props.room.maxPlayers} 席</p>
        </header>
        <div className="member-roster">
          {props.room.members.map((member, index) => (
            <article className="member-row" key={member.accountId}>
              <span className="member-index">{String(index + 1).padStart(2, '0')}</span>
              <span className={`member-avatar ${member.connected ? 'is-online' : ''}`}>{Array.from(member.name)[0]?.toUpperCase()}</span>
              <div><strong>{member.name}</strong><small>{member.accountId === props.room.hostId ? '房主' : member.accountId === props.accountId ? '当前账号' : '协作者'}</small></div>
              <span className={`member-presence ${member.connected ? 'is-online' : ''}`}><i />{member.connected ? '已连接' : '离线'}</span>
            </article>
          ))}
          {Array.from({ length: props.room.maxPlayers - props.room.members.length }, (_, index) => (
            <div className="member-row empty" key={`empty-${index}`}><span className="member-index">{String(props.room.members.length + index + 1).padStart(2, '0')}</span><span>等待协作者</span></div>
          ))}
        </div>
        {props.isHost ? (
          <button className="primary-button start-operation" type="button" disabled={!props.connected || props.pending} onClick={props.onStart}>
            {props.pending ? <RefreshCw className="spin" /> : <Play />}
            启动本轮任务
          </button>
        ) : (
          <div className="host-waiting"><Clock3 /><span>等待房主启动任务</span></div>
        )}
      </section>
      <aside className="waiting-chat"><ChatPanel messages={props.room.messages} onChat={props.onChat} /></aside>
    </main>
  );
}

function MissionBand({ factory, onLaunch, pending }: { factory: FactorySnapshot; onLaunch: () => void; pending: boolean }) {
  const launchStage = COMPLETED_MISSION_STAGE - 1;
  const readyToLaunch = factory.mission.stage === launchStage && factory.mission.objectives.every((objective) => objective.complete);
  return (
    <section className={`mission-band ${factory.phase === 'completed' ? 'is-complete' : ''}`}>
      <div className="mission-stage"><span>{factory.phase === 'completed' ? 'MISSION COMPLETE' : `STAGE ${factory.mission.stage + 1}`}</span><h2>{factory.mission.title}</h2></div>
      <div className="mission-progress">
        <div><span>{factory.mission.status}</span><strong>{Math.round(factory.mission.progress * 100)}%</strong></div>
        <div className="progress-track"><i style={{ width: `${factory.mission.progress * 100}%` }} /></div>
      </div>
      {factory.phase === 'completed' ? (
        <div className="mission-complete"><CircleCheck />任务完成</div>
      ) : factory.mission.stage === launchStage ? (
        <button className="launch-command" type="button" disabled={!readyToLaunch || pending} onClick={onLaunch}>{pending ? <RefreshCw className="spin" /> : <Rocket />}发射火箭</button>
      ) : (
        <div className="mission-objective-count"><ClipboardList /><span>{factory.mission.objectives.filter((item) => item.complete).length}/{factory.mission.objectives.length}</span></div>
      )}
    </section>
  );
}

function FactoryNavigation({ tab, onChange }: { tab: FactoryTab; onChange: (tab: FactoryTab) => void }) {
  const tabs: Array<{ id: FactoryTab; label: string; icon: ReactNode }> = [
    { id: 'overview', label: '任务', icon: <LayoutDashboard /> },
    { id: 'production', label: '生产', icon: <Wrench /> },
    { id: 'research', label: '科研', icon: <FlaskConical /> },
    { id: 'team', label: '协作', icon: <Users /> },
  ];
  return (
    <nav className="factory-navigation" aria-label="工厂视图">
      {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'is-active' : ''} onClick={() => onChange(item.id)}>{item.icon}<span>{item.label}</span></button>)}
    </nav>
  );
}

function OverviewTab(props: { factory: FactorySnapshot }) {
  return (
    <div className="overview-tab">
      <section className="metric-strip">
        <Metric icon={<Power />} label="电网负载" value={`${formatNumber(props.factory.power.demand)} / ${formatNumber(props.factory.power.supply)}`} accent={props.factory.power.satisfaction < 1 ? 'warning' : 'normal'} />
        <Metric icon={<PackageOpen />} label="单项仓储" value={formatNumber(props.factory.storageCapacity)} />
        <Metric icon={<Gauge />} label="物流增益" value={`+${Math.round(props.factory.modifiers.throughput * 100)}%`} />
        <Metric icon={<Factory />} label="产能增益" value={`+${Math.round(props.factory.modifiers.productivity * 100)}%`} />
        <Metric icon={<Clock3 />} label="运行时间" value={formatDuration(props.factory.totalRuntimeSeconds)} />
      </section>

      <section className="mission-objectives">
        <SectionHeading eyebrow="CURRENT OBJECTIVES" title={props.factory.mission.title} icon={<ClipboardList />} />
        <div className="objective-list">
          {props.factory.mission.objectives.length === 0 ? (
            <div className="completed-objective"><CircleCheck /><span>轨道火箭与卫星已发射</span></div>
          ) : props.factory.mission.objectives.map((objective) => (
            <div className={`objective-row ${objective.complete ? 'is-complete' : ''}`} key={objective.id}>
              <span className="objective-check">{objective.complete ? <Check /> : null}</span>
              <span>{objective.label}</span>
              <div className="objective-progress"><i style={{ width: `${Math.min(100, objective.current / objective.target * 100)}%` }} /></div>
              <strong>{formatNumber(objective.current)} / {formatNumber(objective.target)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, accent = 'normal' }: { icon: ReactNode; label: string; value: string; accent?: 'normal' | 'warning' }) {
  return <div className={`metric-item metric-${accent}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function InventoryShelf({ factory }: { factory: FactorySnapshot }) {
  const groups = [
    { id: 'raw', label: '原料' },
    { id: 'fluid', label: '流体' },
    { id: 'material', label: '材料' },
    { id: 'component', label: '元件' },
    { id: 'logistics', label: '物流与模块' },
    { id: 'science', label: '科学包' },
    { id: 'project', label: '航天工程' },
  ] as const;
  const unlockedGroups = groups
    .map((group) => ({
      ...group,
      resources: RESOURCE_DEFINITIONS.filter((resource) => (
        resource.category === group.id
        && isResourceUnlocked(resource.id, factory.mission.stage, factory.technologies)
      )),
    }))
    .filter((group) => group.resources.length > 0);
  return (
    <aside className="inventory-shelf" aria-label="当前库存">
      <header>
        <div><Boxes /><strong>当前库存</strong></div>
        <span>单项上限 {formatNumber(factory.storageCapacity)}</span>
      </header>
      <div className="inventory-groups">
        {unlockedGroups.map((group) => (
          <section className="inventory-group" key={group.id}>
            <h3>{group.label}</h3>
            <div>
              {group.resources.map((resource) => {
                const value = resourceValue(factory, resource.id);
                const rate = resourceRate(factory, resource.id);
                return (
                  <article className="inventory-item" key={resource.id} title={`${resource.name}：${formatNumber(value)}，${formatRate(rate)}`}>
                    <ResourceSwatch id={resource.id} />
                    <div><span>{resource.name}</span><strong>{formatNumber(value)}</strong></div>
                    <small className={rate < 0 ? 'is-negative' : rate > 0 ? 'is-positive' : ''}>{formatRate(rate)}</small>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

function ManualGatherPanel(props: {
  accountId: string;
  factory: FactorySnapshot;
  pending: string | null;
  onCommand: (key: string, command: FactoryCommandInput) => void;
}) {
  const activeJob = props.factory.manualJobs.find(([accountId]) => accountId === props.accountId);
  const now = useSyncedServerNow(props.factory.serverTime, Boolean(activeJob));
  const activeProgress = activeJob
    ? Math.max(0, Math.min(1, (now - activeJob[2]) / (activeJob[3] - activeJob[2])))
    : 0;
  const teamJobs = props.factory.manualJobs.length;
  const unlockedResources = (['ironOre', 'copperOre', 'coal', 'stone'] as const).filter((resourceId) => (
    isResourceUnlocked(resourceId, props.factory.mission.stage, props.factory.technologies)
  ));
  return (
    <section className="manual-station" aria-labelledby="manual-station-title">
      <header>
        <div>
          <span className="manual-station-icon"><Pickaxe /></span>
          <div><small>MANUAL EXTRACTION</small><h3 id="manual-station-title">手动采集</h3></div>
        </div>
        <span>{teamJobs > 0 ? `${teamJobs} 名协作者正在采集` : '选择矿物启动一次采集作业'}</span>
      </header>
      <div className="manual-gather-grid">
        {unlockedResources.map((resourceId) => {
          const resource = RESOURCE_BY_ID[resourceId];
          const isActive = activeJob?.[1] === resourceId;
          const atCapacity = resourceValue(props.factory, resourceId) >= props.factory.storageCapacity;
          const key = `gather-${resourceId}`;
          const remainingSeconds = activeJob ? Math.max(0, activeJob[3] - now) / 1_000 : MANUAL_GATHER_DURATION_MS / 1_000;
          return (
            <article className={`manual-gather-card ${isActive ? 'is-active' : ''}`} key={resourceId}>
              <div className="gather-card-heading">
                <ResourceSwatch id={resourceId} />
                <div><strong>{resource.name}</strong><small>库存 {formatNumber(resourceValue(props.factory, resourceId))}</small></div>
              </div>
              <div className="gather-job-meta">
                <span>产出 +{MANUAL_GATHER_AMOUNT}</span>
                <span>{isActive && activeProgress >= 1 ? '等待服务端结算' : `${remainingSeconds.toFixed(1)} 秒`}</span>
              </div>
              <div className="gather-progress" role="progressbar" aria-label={`${resource.name}采集进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={isActive ? Math.round(activeProgress * 100) : 0}>
                <i style={{ width: `${isActive ? activeProgress * 100 : 0}%` }} />
              </div>
              <button
                type="button"
                aria-label={`采集${resource.name}`}
                disabled={props.pending !== null || Boolean(activeJob) || atCapacity}
                onClick={() => props.onCommand(key, { type: 'gather', resourceId })}
              >
                {props.pending === key ? <RefreshCw className="spin" /> : <Pickaxe />}
                {isActive ? '采集中' : atCapacity ? '仓库已满' : '采集'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function useSyncedServerNow(serverTime: number, active: boolean): number {
  const anchor = useRef({ serverTime, localTime: performance.now() });
  const [now, setNow] = useState(serverTime);
  useEffect(() => {
    anchor.current = { serverTime, localTime: performance.now() };
    setNow(serverTime);
  }, [serverTime]);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      setNow(anchor.current.serverTime + performance.now() - anchor.current.localTime);
    }, 50);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

function ProductionTab(props: {
  accountId: string;
  room: RoomView;
  factory: FactorySnapshot;
  pending: string | null;
  onCommand: (key: string, command: FactoryCommandInput) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | LineCategory>('all');
  const [query, setQuery] = useState('');
  const [buildBatch, setBuildBatch] = useState<1 | 5 | 10>(1);
  const lineStates = useMemo(() => new Map(props.factory.lines.map((line) => [line[0], line])), [props.factory.lines]);
  const categories: Array<{ id: LineCategory; label: string }> = [
    { id: 'extraction', label: '资源采掘' },
    { id: 'smelting', label: '冶炼加工' },
    { id: 'processing', label: '流体与化工' },
    { id: 'assembly', label: '组件装配' },
    { id: 'logistics', label: '物流制造' },
    { id: 'science', label: '科学包' },
    { id: 'power', label: '电力系统' },
    { id: 'infrastructure', label: '基础设施' },
    { id: 'project', label: '航天工程' },
  ];
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const unlockedCategories = categories
    .map((category) => ({
      ...category,
      lines: PRODUCTION_LINE_DEFINITIONS.filter((line) => (
        line.category === category.id
        && isProductionLineUnlocked(line.id, props.factory.mission.stage, props.factory.technologies)
        && (!normalizedQuery || `${line.name}${line.description}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery))
      )),
    }))
    .filter((category) => category.lines.length > 0 && (categoryFilter === 'all' || categoryFilter === category.id));
  const unlockedCountByCategory = new Map(categories.map((category) => [
    category.id,
    PRODUCTION_LINE_DEFINITIONS.filter((line) => (
      line.category === category.id
      && isProductionLineUnlocked(line.id, props.factory.mission.stage, props.factory.technologies)
    )).length,
  ]));
  const specialistCount = props.room.members.filter((member) => member.specialization !== null).length;
  return (
    <div className="production-tab">
      <header className="tab-heading"><div><span>PRODUCTION CONTROL</span><h2>生产设施</h2></div><p><Gauge />电网 {Math.round(props.factory.power.satisfaction * 100)}% · <BriefcaseBusiness />{specialistCount} 个岗位</p></header>
      {props.factory.phase !== 'completed' && (
        <ManualGatherPanel
          accountId={props.accountId}
          factory={props.factory}
          pending={props.pending}
          onCommand={props.onCommand}
        />
      )}
      <div className="production-toolbar">
        <div className="production-filters" role="tablist" aria-label="设施分类">
          <button type="button" className={categoryFilter === 'all' ? 'is-active' : ''} onClick={() => setCategoryFilter('all')}>全部</button>
          {categories.filter((category) => (unlockedCountByCategory.get(category.id) ?? 0) > 0).map((category) => (
            <button key={category.id} type="button" className={categoryFilter === category.id ? 'is-active' : ''} onClick={() => setCategoryFilter(category.id)}>
              {category.label}<span>{unlockedCountByCategory.get(category.id)}</span>
            </button>
          ))}
        </div>
        <div className="batch-control" aria-label="批量建造数量">
          {([1, 5, 10] as const).map((amount) => (
            <button type="button" className={buildBatch === amount ? 'is-active' : ''} key={amount} title={`每次建造 ${amount} 座`} onClick={() => setBuildBatch(amount)}>×{amount}</button>
          ))}
        </div>
        <label className="production-search">
          <Search />
          <input value={query} placeholder="搜索设施或产物" aria-label="搜索设施或产物" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      {unlockedCategories.map((category) => (
        <section className="production-group" key={category.id}>
          <h3>{category.label}<span>{category.lines.length}</span></h3>
          <div className="production-lines">
            {category.lines.map((definition) => {
              const tuple = lineStates.get(definition.id) ?? [definition.id, 0, 0, 1] as ProductionLineTuple;
              const affordable = costEntries(definition.buildCost).every(([id, amount]) => resourceValue(props.factory, id) >= amount * buildBatch);
              const hasAdjustableState = !definition.passive;
              const hasPriority = Object.keys(definition.outputs).length > 0;
              return (
                <article className="production-line" key={definition.id}>
                  <div className="line-main">
                    <span className="line-symbol"><GameIcon icon={definition.icon} /></span>
                    <div className="line-copy"><strong>{definition.name}</strong><span>{definition.description}</span></div>
                    <ResourceFlow inputs={definition.inputs} outputs={definition.outputs} />
                  </div>
                  <div className="line-controls">
                    <div className="line-count"><small>已建</small><strong>{tuple[1]}</strong></div>
                    {hasAdjustableState && tuple[1] > 0 && (
                      <div className="active-stepper" aria-label={`${definition.name}运行数量`}>
                        <button type="button" title="减少运行数量" aria-label={`减少 ${definition.name} 运行数量`} disabled={props.pending !== null || tuple[2] <= 0} onClick={() => props.onCommand(`active-${definition.id}`, { type: 'setActive', lineId: definition.id, active: tuple[2] - 1 })}><Minus /></button>
                        <span><b>{tuple[2]}</b><small>运行</small></span>
                        <button type="button" title="增加运行数量" aria-label={`增加 ${definition.name} 运行数量`} disabled={props.pending !== null || tuple[2] >= tuple[1]} onClick={() => props.onCommand(`active-${definition.id}`, { type: 'setActive', lineId: definition.id, active: tuple[2] + 1 })}><Plus /></button>
                      </div>
                    )}
                    {hasPriority && tuple[1] > 0 && (
                      <div className="priority-control" aria-label={`${definition.name}生产优先级`}>
                        <button type="button" className={tuple[3] === 0 ? 'is-active' : ''} title="低优先级" aria-label={`将 ${definition.name} 设为低优先级`} disabled={props.pending !== null} onClick={() => props.onCommand(`priority-${definition.id}`, { type: 'setPriority', lineId: definition.id, priority: 0 })}><ArrowDown /></button>
                        <button type="button" className={tuple[3] === 1 ? 'is-active' : ''} title="标准优先级" aria-label={`将 ${definition.name} 设为标准优先级`} disabled={props.pending !== null} onClick={() => props.onCommand(`priority-${definition.id}`, { type: 'setPriority', lineId: definition.id, priority: 1 })}><Minus /></button>
                        <button type="button" className={tuple[3] === 2 ? 'is-active' : ''} title="高优先级" aria-label={`将 ${definition.name} 设为高优先级`} disabled={props.pending !== null} onClick={() => props.onCommand(`priority-${definition.id}`, { type: 'setPriority', lineId: definition.id, priority: 2 })}><ArrowUp /></button>
                      </div>
                    )}
                    <div className="build-cost"><ResourceAmountList amounts={definition.buildCost} /></div>
                    <button className="build-command" type="button" disabled={props.pending !== null || !affordable || tuple[1] + buildBatch > definition.maxCount || props.factory.phase === 'completed'} onClick={() => props.onCommand(`build-${definition.id}`, { type: 'build', lineId: definition.id, amount: buildBatch })}>
                      {props.pending === `build-${definition.id}` ? <RefreshCw className="spin" /> : <Hammer />}<span>建造{buildBatch > 1 ? ` ×${buildBatch}` : ''}</span>
                    </button>
                    <button className="icon-button dismantle-command" type="button" title={`拆除 ${definition.name}`} aria-label={`拆除 ${definition.name}`} disabled={props.pending !== null || tuple[1] <= 0 || props.factory.phase === 'completed'} onClick={() => props.onCommand(`dismantle-${definition.id}`, { type: 'dismantle', lineId: definition.id })}><Trash2 /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {unlockedCategories.length === 0 && <div className="production-empty"><Search /><span>没有匹配的已解锁设施</span></div>}
    </div>
  );
}

function ResearchTab(props: {
  factory: FactorySnapshot;
  pending: string | null;
  onCommand: (key: string, command: FactoryCommandInput) => void;
}) {
  const lab = props.factory.lines.find(([id]) => id === 'researchLab');
  const visibleTechnologies = TECHNOLOGY_DEFINITIONS.filter((technology) => (
    isTechnologyVisible(technology.id, props.factory.mission.stage, props.factory.technologies)
  ));
  const unlockedScience = RESOURCE_DEFINITIONS.filter((resource) => (
    resource.category === 'science'
    && isResourceUnlocked(resource.id, props.factory.mission.stage, props.factory.technologies)
  ));
  return (
    <div className="research-tab">
      <header className="tab-heading"><div><span>RESEARCH QUEUE</span><h2>科研路线</h2></div><p><FlaskConical />{lab?.[2] ?? 0} 座实验室运行</p></header>
      <div className="science-inventory" aria-label="科学包库存">
        {unlockedScience.map((resource) => (
          <div key={resource.id}><ResourceSwatch id={resource.id} /><span>{resource.name}</span><strong>{formatNumber(resourceValue(props.factory, resource.id))}</strong></div>
        ))}
      </div>
      <div className="technology-list">
        {visibleTechnologies.map((technology, index) => {
          const unlocked = props.factory.technologies.includes(technology.id);
          const prerequisitesReady = technology.prerequisites.every((id) => props.factory.technologies.includes(id));
          const affordable = costEntries(technology.cost).every(([id, amount]) => resourceValue(props.factory, id) >= amount);
          return (
            <article className={`technology-row ${unlocked ? 'is-complete' : ''}`} key={technology.id}>
              <span className="technology-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="technology-node">{unlocked ? <Check /> : <GameIcon icon={technology.icon} />}</span>
              <div className="technology-copy"><strong>{technology.name}</strong><span>{technology.description}</span><small>{technology.prerequisites.length ? `前置：${technology.prerequisites.map((id) => TECHNOLOGY_BY_ID[id].name).join('、')}` : '基础研究'}</small></div>
              <div className="technology-cost"><small>科学包需求</small><ResourceAmountList amounts={technology.cost} /></div>
              {unlocked ? (
                <span className="researched-label"><CircleCheck />已完成</span>
              ) : (
                <button className="research-command" type="button" disabled={props.pending !== null || !prerequisitesReady || !affordable || (lab?.[2] ?? 0) < 1 || props.factory.phase === 'completed'} onClick={() => props.onCommand(`research-${technology.id}`, { type: 'research', technologyId: technology.id })}>
                  {props.pending === `research-${technology.id}` ? <RefreshCw className="spin" /> : <ArrowRight />}研究
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function TeamTab({ room, accountId, pending, onCommand, onChat }: {
  room: RoomView;
  accountId: string;
  pending: string | null;
  onCommand: (key: string, command: FactoryCommandInput) => void;
  onChat: (text: string) => Promise<ActionResult>;
}) {
  const currentMember = room.members.find((member) => member.accountId === accountId);
  return (
    <div className="team-tab">
      <header className="tab-heading"><div><span>CREW OPERATIONS</span><h2>协作组</h2></div><p><Users />{room.members.filter((member) => member.connected).length} 人在线</p></header>
      <section className="specialization-panel">
        <header><BriefcaseBusiness /><div><small>CREW SPECIALIZATIONS</small><strong>协作岗位</strong></div></header>
        <div className="specialization-grid">
          {SPECIALIZATION_DEFINITIONS.map((specialization) => {
            const count = room.members.filter((member) => member.specialization === specialization.id).length;
            const active = currentMember?.specialization === specialization.id;
            const bonus = count === 0 ? 12 : Math.min(27, 12 + (count - 1) * 5);
            return (
              <button className={active ? 'is-active' : ''} type="button" key={specialization.id} disabled={pending !== null || active} onClick={() => onCommand(`role-${specialization.id}`, { type: 'assignSpecialization', specializationId: specialization.id })}>
                <span><GameIcon icon={specialization.icon} /></span>
                <div><strong>{specialization.name}</strong><small>{specialization.description}</small></div>
                <b>{count} 人<small>+{bonus}%</small></b>
              </button>
            );
          })}
        </div>
      </section>
      <div className="team-grid">
        <section className="contributor-list">
          {room.members.slice().sort((left, right) => right.contribution - left.contribution).map((member, index) => (
            <article className="contributor-row" key={member.accountId}>
              <span className="contributor-rank">{index + 1}</span>
              <span className={`member-avatar ${member.connected ? 'is-online' : ''}`}>{Array.from(member.name)[0]?.toUpperCase()}</span>
              <div><strong>{member.name}{member.accountId === accountId ? '（你）' : ''}</strong><small>{member.specialization ? SPECIALIZATION_BY_ID[member.specialization].name : member.accountId === room.hostId ? '房主 · 未分配岗位' : member.connected ? '在线协作 · 未分配岗位' : `上次在线 ${formatDateTime(member.lastSeenAt)}`}</small></div>
              <strong className="contribution-score">{formatNumber(member.contribution)}<small>贡献</small></strong>
            </article>
          ))}
        </section>
        <section className="team-chat"><ChatPanel messages={room.messages} onChat={onChat} /></section>
      </div>
      <ActivityRail room={room} />
    </div>
  );
}

function FactoryStatusBar({ room, factory }: { room: RoomView; factory: FactorySnapshot }) {
  return (
    <footer className="factory-statusbar">
      <span><Power />供电 {formatNumber(factory.power.supply)}</span>
      <span><Gauge />负载 {Math.round(factory.power.satisfaction * 100)}%</span>
      <span><Factory />吞吐 +{Math.round(factory.modifiers.throughput * 100)}%</span>
      <span><Users />在线 {room.members.filter((member) => member.connected).length}</span>
      <span><Clock3 />运行 {formatDuration(factory.totalRuntimeSeconds)}</span>
    </footer>
  );
}

function ActivityRail({ room }: { room: RoomView }) {
  return (
    <aside className="activity-rail">
      <header><Activity /><div><span>ACTIVITY LOG</span><strong>协作记录</strong></div></header>
      <div className="activity-list">
        {room.activity.length === 0 ? <p>暂无协作记录</p> : room.activity.slice().reverse().map((entry) => (
          <div className={`activity-entry activity-${entry.kind}`} key={entry.id}>
            <i />
            <div><strong>{entry.actorName}</strong><span>{entry.text}</span><small>{formatDateTime(entry.createdAt)}</small></div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ChatPanel({ messages, onChat }: { messages: ChatMessage[]; onChat: (text: string) => Promise<ActionResult> }) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || pending) return;
    setPending(true);
    setError(null);
    const result = await onChat(text);
    if (result.ok) setText('');
    else setError(result.error ?? '发送失败');
    setPending(false);
  };
  return (
    <div className="chat-panel">
      <header><MessageSquare /><div><span>ROOM COMMS</span><strong>房间通讯</strong></div></header>
      <div className="chat-messages">
        {messages.length === 0 ? <p>暂无消息</p> : messages.map((message) => (
          <div className="chat-message" key={message.id}><span><strong>{message.senderName}</strong><small>{formatDateTime(message.sentAt)}</small></span><p>{message.text}</p></div>
        ))}
      </div>
      <form onSubmit={(event) => void submit(event)}>
        <input aria-label="聊天消息" value={text} maxLength={180} placeholder="发送消息" onChange={(event) => setText(event.target.value)} />
        <button className="icon-button" type="submit" title="发送" aria-label="发送消息" disabled={!text.trim() || pending}>{pending ? <RefreshCw className="spin" /> : <Send />}</button>
      </form>
      {error && <small className="chat-error">{error}</small>}
    </div>
  );
}

function SectionHeading({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: ReactNode }) {
  return <header className="section-heading"><span className="section-icon">{icon}</span><div><small>{eyebrow}</small><h2>{title}</h2></div></header>;
}

function ResourceSwatch({ id }: { id: ResourceId }) {
  const resource = RESOURCE_BY_ID[id];
  return <span className={`resource-swatch tone-${resource.tone}`} title={resource.name}><GameIcon icon={resource.icon} /></span>;
}

function resourceValue(factory: FactorySnapshot, id: ResourceId): number {
  return factory.resources[RESOURCE_IDS.indexOf(id)] ?? 0;
}

function resourceRate(factory: FactorySnapshot, id: ResourceId): number {
  return factory.rates[RESOURCE_IDS.indexOf(id)] ?? 0;
}

function costEntries(cost: Readonly<Partial<Record<ResourceId, number>>>): Array<[ResourceId, number]> {
  return Object.entries(cost).filter((entry): entry is [ResourceId, number] => typeof entry[1] === 'number');
}

function ResourceAmountList({ amounts, perSecond = false }: {
  amounts: Readonly<Partial<Record<ResourceId, number>>>;
  perSecond?: boolean;
}) {
  return (
    <div className="resource-amount-list">
      {costEntries(amounts).map(([id, amount]) => {
        const resource = RESOURCE_BY_ID[id];
        return (
          <span className={`resource-amount tone-${resource.tone}`} title={`${resource.name} ${formatNumber(amount)}${perSecond ? '/秒' : ''}`} key={id}>
            <GameIcon icon={resource.icon} />
            <b>{formatNumber(amount)}{perSecond ? '/s' : ''}</b>
          </span>
        );
      })}
    </div>
  );
}

function ResourceFlow({ inputs, outputs }: {
  inputs: Readonly<Partial<Record<ResourceId, number>>>;
  outputs: Readonly<Partial<Record<ResourceId, number>>>;
}) {
  const hasInputs = costEntries(inputs).length > 0;
  const hasOutputs = costEntries(outputs).length > 0;
  if (!hasInputs && !hasOutputs) return <div className="line-flow line-flow-passive">结构设施</div>;
  return (
    <div className="line-flow">
      {hasInputs && <ResourceAmountList amounts={inputs} perSecond />}
      {hasInputs && hasOutputs && <ArrowRight />}
      {hasOutputs && <ResourceAmountList amounts={outputs} perSecond />}
    </div>
  );
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Math.abs(value) >= 100) return Math.floor(value).toLocaleString('zh-CN');
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatRate(value: number): string {
  if (Math.abs(value) < 0.001) return '0 /秒';
  return `${value > 0 ? '+' : ''}${formatNumber(value)} /秒`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor(totalSeconds % 3_600 / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}天 ${hours % 24}时`;
  if (hours > 0) return `${hours}时 ${minutes}分`;
  return `${minutes}分`;
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}
