'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Block, Transaction, createBlock, generateMempool, formatAddress, formatHash, estimateGasFee } from '@/lib/blockchain';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chain, setChain] = useState<Block[]>([]);
  const [mempool, setMempool] = useState<Transaction[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [gasPrices, setGasPrices] = useState({ slow: 20, standard: 30, fast: 50 });
  const [isMining, setIsMining] = useState(false);

  // Initialize blockchain
  useEffect(() => {
    initBlockchain();
    setMempool(generateMempool(8));
    setGasPrices({
      slow: estimateGasFee('slow'),
      standard: estimateGasFee('standard'),
      fast: estimateGasFee('fast'),
    });
  }, []);

  async function initBlockchain() {
    const blocks: Block[] = [];
    const genesisTxs = Array.from({ length: 3 }, () => ({
      id: Math.random().toString(36).slice(2, 10),
      from: '0x0000000000000000000000000000000000000000',
      to: '0x' + Math.random().toString(16).slice(2, 42),
      amount: Math.random() * 10,
      timestamp: Date.now(),
      gasUsed: 21000,
    }));

    const genesis = await createBlock(0, genesisTxs, '0'.repeat(64), 1);
    blocks.push(genesis);

    for (let i = 1; i < 6; i++) {
      const txs = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({
        id: Math.random().toString(36).slice(2, 10),
        from: '0x' + Math.random().toString(16).slice(2, 42),
        to: '0x' + Math.random().toString(16).slice(2, 42),
        amount: Math.random() * 10,
        timestamp: Date.now() - (6 - i) * 600000,
        gasUsed: 21000 + Math.floor(Math.random() * 30000),
      }));
      const block = await createBlock(i, txs, blocks[i - 1].hash, 2);
      blocks.push(block);
    }
    setChain(blocks);
    setSelectedBlock(genesis);
  }

  // Mine new block
  const mineBlock = useCallback(async () => {
    if (isMining || chain.length === 0) return;
    setIsMining(true);

    const txs = mempool.slice(0, 3).map(t => ({ ...t, timestamp: Date.now() }));
    const newBlock = await createBlock(chain.length, txs, chain[chain.length - 1].hash, 2);

    setChain(prev => [...prev, newBlock]);
    setMempool(prev => [...prev.slice(3), ...generateMempool(3)]);
    setSelectedBlock(newBlock);
    setIsMining(false);
  }, [isMining, chain, mempool]);

  // Animate blockchain on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    function draw() {
      if (!ctx || !canvas) return;

      const w = canvas.width = canvas.offsetWidth * 2;
      const h = canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
      const cw = w / 2;
      const ch = h / 2;

      // Background gradient
      const bgGrad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw);
      bgGrad.addColorStop(0, '#1a1a2e');
      bgGrad.addColorStop(1, '#0a0a12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Draw floating particles
      ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
      for (let i = 0; i < 50; i++) {
        const x = ((i * 73 + time * 0.3) % cw);
        const y = ((i * 47 + Math.sin(time * 0.01 + i) * 20) % ch);
        const r = 1 + Math.sin(time * 0.05 + i) * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw blockchain
      const blockW = 60;
      const blockH = 50;
      const gap = 30;
      const startX = 30;
      const chainY = ch / 2 - 10;

      chain.forEach((block, i) => {
        const x = startX + i * (blockW + gap);
        const isSelected = selectedBlock?.index === i;
        const floatY = Math.sin(time * 0.03 + i) * 5;

        // Connection line
        if (i > 0) {
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - gap + blockW / 2, chainY + blockH / 2 + floatY);
          ctx.lineTo(x + blockW / 2, chainY + blockH / 2 + floatY);
          ctx.stroke();
        }

        // Block
        ctx.fillStyle = isSelected ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = isSelected ? '#818cf8' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = isSelected ? 2 : 1;

        // Rounded rect
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(x + r, chainY + floatY);
        ctx.lineTo(x + blockW - r, chainY + floatY);
        ctx.quadraticCurveTo(x + blockW, chainY + floatY, x + blockW, chainY + r + floatY);
        ctx.lineTo(x + blockW, chainY + blockH - r + floatY);
        ctx.quadraticCurveTo(x + blockW, chainY + blockH + floatY, x + blockW - r, chainY + blockH + floatY);
        ctx.lineTo(x + r, chainY + blockH + floatY);
        ctx.quadraticCurveTo(x, chainY + blockH + floatY, x, chainY + blockH - r + floatY);
        ctx.lineTo(x, chainY + r + floatY);
        ctx.quadraticCurveTo(x, chainY + floatY, x + r, chainY + floatY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Block number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${block.index}`, x + blockW / 2, chainY + 22 + floatY);

        // TX count
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(`${block.transactions.length} txns`, x + blockW / 2, chainY + 38 + floatY);

        // Glow for selected
        if (isSelected) {
          ctx.shadowColor = '#818cf8';
          ctx.shadowBlur = 15;
        }
      });

      time++;
      animFrame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [chain, selectedBlock]);

  // Click on canvas to select block
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const blockW = 60;
    const gap = 30;
    const startX = 30;
    const blockIndex = Math.floor((x - startX) / (blockW + gap));
    if (blockIndex >= 0 && blockIndex < chain.length) {
      setSelectedBlock(chain[blockIndex]);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Blockchain Explorer
          </h1>
          <p className="text-gray-400">Interactive blockchain visualization & exploration</p>
        </header>

        {/* Blockchain Canvas */}
        <div className="glass-card mb-6 glow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-400">⛓️</span> Blockchain
          </h2>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-48 cursor-pointer rounded-lg"
          />
          <div className="flex justify-between mt-4 text-sm text-gray-400">
            <span>Height: {chain.length} blocks</span>
            <span>Click a block to inspect</span>
          </div>
        </div>

        {/* Grid: Mempool + Gas + Block Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mempool */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-yellow-400">⏳</span> Mempool
              <span className="ml-auto text-sm bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                {mempool.length} pending
              </span>
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {mempool.map((tx, i) => (
                <div key={tx.id} className="bg-white/5 rounded-lg p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">From:</span>
                    <span className="text-blue-400 font-mono">{formatAddress(tx.from)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">To:</span>
                    <span className="text-green-400 font-mono">{formatAddress(tx.to)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-purple-400">{tx.amount.toFixed(4)} ETH</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={mineBlock}
              disabled={isMining}
              className="w-full mt-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMining ? '⛏️ Mining...' : '⛏️ Mine Block'}
            </button>
          </div>

          {/* Gas Fee Estimator */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-green-400">⛽</span> Gas Fees (Gwei)
            </h3>
            <div className="space-y-4">
              {[
                { label: '🐢 Slow', value: gasPrices.slow, color: 'from-green-600 to-green-400', time: '~5 min' },
                { label: '⚡ Standard', value: gasPrices.standard, color: 'from-yellow-600 to-yellow-400', time: '~2 min' },
                { label: '🚀 Fast', value: gasPrices.fast, color: 'from-red-600 to-red-400', time: '~15 sec' },
              ].map(({ label, value, color, time }) => (
                <div key={label} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{label}</span>
                    <span className="text-gray-400">{time}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${Math.min(value / 50 * 100, 100)}%` }} />
                    </div>
                    <span className="font-mono text-lg">{value.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Block Details */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-blue-400">📦</span> Block #{selectedBlock?.index ?? 0}
            </h3>
            {selectedBlock && (
              <div className="space-y-3 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-1">Hash</div>
                  <div className="font-mono text-blue-400 break-all">{formatHash(selectedBlock.hash, 20)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-1">Previous Hash</div>
                  <div className="font-mono text-gray-500 break-all">{formatHash(selectedBlock.previousHash, 20)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-gray-400 mb-1">Nonce</div>
                    <div className="font-mono">{selectedBlock.nonce}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-gray-400 mb-1">Difficulty</div>
                    <div className="font-mono">{selectedBlock.difficulty}</div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-1">Miner</div>
                  <div className="font-mono text-green-400">{formatAddress(selectedBlock.miner)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-1">Reward</div>
                  <div className="font-mono text-yellow-400">{selectedBlock.reward.toFixed(4)} ETH</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-gray-400 mb-2">Transactions ({selectedBlock.transactions.length})</div>
                  <div className="space-y-2">
                    {selectedBlock.transactions.map((tx) => (
                      <div key={tx.id} className="text-xs flex justify-between">
                        <span className="text-blue-400">{formatAddress(tx.from)}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-green-400">{formatAddress(tx.to)}</span>
                        <span className="text-purple-400">{tx.amount.toFixed(2)} ETH</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Blocks', value: chain.length, icon: '📦' },
            { label: 'Total TXs', value: chain.reduce((sum, b) => sum + b.transactions.length, 0), icon: '📊' },
            { label: 'Avg Gas', value: `${(chain.reduce((sum, b) => sum + b.transactions.reduce((s, t) => s + t.gasUsed, 0), 0) / Math.max(chain.length, 1) / 1000).toFixed(1)}k`, icon: '⛽' },
            { label: 'Pending', value: mempool.length, icon: '⏳' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="glass-card text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-gray-400 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}