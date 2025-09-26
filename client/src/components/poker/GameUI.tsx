import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePoker } from '@/lib/stores/usePoker';
import { useLanguage } from '@/lib/stores/useLanguage';
import { socketClient } from '@/lib/socketClient';
import { IronicEventModal } from './IronicEventModal';

const GameUI: React.FC = () => {
  const {
    gameState,
    selectedAction,
    raiseAmount,
    setSelectedAction,
    setRaiseAmount,
    isMyTurn,
    canCheck,
    canCall,
    canRaise,
    getCallAmount,
    getMinRaise,
    getMaxRaise,
    getMyPlayer
  } = usePoker();
  
  const { t } = useLanguage();

  const [customRaise, setCustomRaise] = useState(0);
  const [currentIronicEvent, setCurrentIronicEvent] = useState<any>(null);
  const [rouletteNumber, setRouletteNumber] = useState<number | undefined>();
  const myPlayer = getMyPlayer();

  // 🎰 Listen for Bojek Poker's amazing ironic events! 🎲
  useEffect(() => {
    const handleIronicEvent = (eventData: any) => {
      console.log('[FRONTEND] Received ironic event:', eventData);
      setCurrentIronicEvent(eventData.event);
      setRouletteNumber(eventData.rouletteNumber);
    };

    // Check if socketClient has the on method (connected state)
    if (socketClient && typeof socketClient.on === 'function') {
      socketClient.on('ironic-event', handleIronicEvent);
      
      return () => {
        if (socketClient && typeof socketClient.off === 'function') {
          socketClient.off('ironic-event', handleIronicEvent);
        }
      };
    } else {
      console.warn('[BOJEK POKER] SocketClient not ready for ironic events');
    }
  }, []);

  if (!gameState || !myPlayer || gameState.phase === 'waiting') {
    return (
      <>
        {/* 🎰 Always show Bojek Poker Ironic Events even when waiting! 🎲 */}
        <IronicEventModal
          event={currentIronicEvent}
          rouletteNumber={rouletteNumber}
          onClose={() => {
            setCurrentIronicEvent(null);
            setRouletteNumber(undefined);
          }}
        />
      </>
    );
  }

  const handleAction = (actionType: 'fold' | 'call' | 'raise' | 'check' | 'bet' | 'all-in') => {
    if (!isMyTurn()) return;

    let amount = undefined;
    if (actionType === 'raise' || actionType === 'bet') {
      amount = customRaise || raiseAmount;
    }

    socketClient.playerAction({
      type: actionType,
      amount,
      playerId: myPlayer.id
    });

    setSelectedAction(null);
    setCustomRaise(0);
  };

  const quickRaiseAmounts = [
    { label: '2x BB', amount: gameState.blinds.big * 2 },
    { label: '3x BB', amount: gameState.blinds.big * 3 },
    { label: '5x BB', amount: gameState.blinds.big * 5 },
    { label: 'Pot', amount: gameState.pot },
  ];

  if (!isMyTurn()) {
    return (
      <>
        {/* 🎰 Bojek Poker Ironic Event Modal for ALL players! 🎲 */}
        <IronicEventModal
          event={currentIronicEvent}
          rouletteNumber={rouletteNumber}
          onClose={() => {
            setCurrentIronicEvent(null);
            setRouletteNumber(undefined);
          }}
        />
        
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-card via-muted to-card/80 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-border">
          <div className="text-center">
            <div className="text-muted-foreground text-sm mb-2">{t('waitingForTurn')}</div>
            <div className="text-foreground text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              {t('playerTurn', { playerName: gameState.players[gameState.currentPlayerIndex]?.name || '' })}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 🎰 Bojek Poker Ironic Event Modal 🎲 */}
      <IronicEventModal
        event={currentIronicEvent}
        rouletteNumber={rouletteNumber}
        onClose={() => {
          setCurrentIronicEvent(null);
          setRouletteNumber(undefined);
        }}
      />
      
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-card via-muted to-card/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border-2 border-primary/30">
      <div className="flex flex-col gap-4">
        {/* Action buttons */}
        <div className="flex gap-3">
          {/* Fold */}
          <Button 
            onClick={() => handleAction('fold')}
            variant="destructive"
            size="lg"
            className=""
          >
            🚫 {t('fold')}
          </Button>

          {/* Check/Call */}
          {canCheck() ? (
            <Button 
              onClick={() => handleAction('check')}
              variant="secondary"
              size="lg"
              className=""
            >
              ✅ {t('check')}
            </Button>
          ) : canCall() ? (
            <Button 
              onClick={() => handleAction('call')}
              variant="gaming"
              size="lg"
              className=""
            >
              💰 {t('call')} ${getCallAmount().toLocaleString()}
            </Button>
          ) : null}

          {/* Raise/Bet */}
          {canRaise() && (
            <Button 
              onClick={() => setSelectedAction(selectedAction === 'raise' ? null : 'raise')}
              variant={selectedAction === 'raise' ? 'neon' : 'outline'}
              size="lg"
              className=""
            >
              🚀 {gameState.currentBet > 0 ? 'Raise' : 'Bet'}
            </Button>
          )}

          {/* All-in */}
          {myPlayer.chips > 0 && (
            <Button 
              onClick={() => handleAction('all-in')}
              variant="outline"
              size="lg"
              className="border-2 border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300 hover:border-yellow-300 font-bold"
            >
              All-in ${myPlayer.chips.toLocaleString()}
            </Button>
          )}
        </div>

        {/* Raise controls */}
        {selectedAction === 'raise' && canRaise() && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="flex justify-between text-white text-sm">
              <span>Min: ${getMinRaise().toLocaleString()}</span>
              <span>Max: ${getMaxRaise().toLocaleString()}</span>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <Slider
                value={[customRaise || getMinRaise()]}
                onValueChange={([value]) => setCustomRaise(value)}
                min={getMinRaise()}
                max={getMaxRaise()}
                step={gameState.blinds.small}
                className="w-full"
              />
              <div className="text-center text-white font-bold">
                ${(customRaise || getMinRaise()).toLocaleString()}
              </div>
            </div>

            {/* Quick bet buttons */}
            <div className="flex gap-2 flex-wrap">
              {quickRaiseAmounts.map(({ label, amount }) => (
                <Button
                  key={label}
                  onClick={() => setCustomRaise(Math.min(amount, getMaxRaise()))}
                  variant="outline"
                  size="sm"
                  disabled={amount > getMaxRaise()}
                  className={amount > getMaxRaise() 
                    ? "bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed" 
                    : "border-2 border-white bg-gray-700 text-white hover:bg-white hover:text-black font-bold"
                  }
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Confirm raise */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction(gameState.currentBet > 0 ? 'raise' : 'bet')}
                variant="default"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                disabled={customRaise < getMinRaise()}
              >
                {gameState.currentBet > 0 ? 'Raise' : 'Bet'} ${(customRaise || getMinRaise()).toLocaleString()}
              </Button>
              <Button
                onClick={() => setSelectedAction(null)}
                variant="outline"
                className="border-2 border-gray-400 bg-gray-400 text-black hover:bg-gray-300 font-bold"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default GameUI;
