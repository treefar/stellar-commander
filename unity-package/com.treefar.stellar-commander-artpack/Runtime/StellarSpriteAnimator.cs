using UnityEngine;

namespace Treefar.StellarCommanderArt
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class StellarSpriteAnimator : MonoBehaviour
    {
        [SerializeField] private SpriteRenderer _spriteRenderer;
        [SerializeField] private string _unitId = "GD01";
        [SerializeField] private string _state = "idle";
        [SerializeField] private bool _isFacingLeft;
        [SerializeField] private bool _useUnscaledTime;
        private float _stateTime;

        private void OnEnable()
        {
            if (_spriteRenderer == null) _spriteRenderer = GetComponent<SpriteRenderer>();
            ApplyFrame();
        }

        private void Update()
        {
            _stateTime += _useUnscaledTime ? Time.unscaledDeltaTime : Time.deltaTime;
            ApplyFrame();
        }

        public void SetUnit(string unitId)
        {
            _unitId = unitId;
            _stateTime = 0f;
            ApplyFrame();
        }

        public void Play(string stateName, bool restart = true)
        {
            if (_state != stateName || restart) _stateTime = 0f;
            _state = stateName;
            ApplyFrame();
        }

        public void SetFacingLeft(bool isFacingLeft)
        {
            _isFacingLeft = isFacingLeft;
            if (_spriteRenderer != null) _spriteRenderer.flipX = _isFacingLeft;
        }

        private void ApplyFrame()
        {
            if (_spriteRenderer == null) return;
            StellarArtPackData.StateDef state = StellarArtPackDatabase.GetState(_unitId, _state);
            if (state == null) return;
            int raw = Mathf.FloorToInt(_stateTime * state.fps);
            int index = state.loop ? raw % state.frames : Mathf.Min(raw, state.frames - 1);
            _spriteRenderer.sprite = StellarArtPackDatabase.GetFrame(_unitId, _state, index);
            _spriteRenderer.flipX = _isFacingLeft;
        }
    }
}
