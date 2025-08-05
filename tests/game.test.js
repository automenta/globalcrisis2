describe('Game Initialization', () => {
  it('should start without throwing an error', () => {
    let error = null;
    try {
      // Mock dependencies
      const mockScene = {
        add: () => {},
      };
      const mockUiState = { arePlumesVisible: true };
      const mockNarrativeManager = new NarrativeManager();

      // Mock DOM elements required by WorldState constructor
      document.body.innerHTML = '<input type="checkbox" id="casual-mode-checkbox">';
      const casualModeCheckbox = document.getElementById('casual-mode-checkbox');

      // Instantiate WorldState
      const worldState = new WorldState(mockScene, mockUiState, mockNarrativeManager, casualModeCheckbox.checked);

      // Instantiate other managers
      const eventManager = new EventManager(worldState);
      const goalManager = new GoalManager(worldState);

    } catch (e) {
      error = e;
    }
    expect(error).toBe(null);
  });
});
