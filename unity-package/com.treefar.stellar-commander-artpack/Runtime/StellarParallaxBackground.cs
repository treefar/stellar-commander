using UnityEngine;

namespace Treefar.StellarCommanderArt
{
    [DisallowMultipleComponent]
    public sealed class StellarParallaxBackground : MonoBehaviour
    {
        private const int TileCount = 3;
        [SerializeField] private string _sceneryId = "space-v1";
        [SerializeField, Min(0f)] private float _pixelsPerSecond = 1f;
        [SerializeField] private bool _useUnscaledTime = true;
        [SerializeField] private int _sortingOrder = -100;
        private readonly SpriteRenderer[] _tiles = new SpriteRenderer[TileCount];
        private float _elapsed;
        private Sprite _sprite;

        private void OnEnable()
        {
            _sprite = StellarArtPackDatabase.GetScenery(_sceneryId);
            if (_sprite == null) return;
            for (int index = 0; index < TileCount; index++)
            {
                Transform child = transform.Find($"Tile{index}");
                if (child == null)
                {
                    GameObject tile = new($"Tile{index}");
                    child = tile.transform;
                    child.SetParent(transform, false);
                }
                _tiles[index] = child.GetComponent<SpriteRenderer>();
                if (_tiles[index] == null) _tiles[index] = child.gameObject.AddComponent<SpriteRenderer>();
                _tiles[index].sprite = _sprite;
                _tiles[index].sortingOrder = _sortingOrder;
            }
            PositionTiles();
        }

        private void Update()
        {
            _elapsed += _useUnscaledTime ? Time.unscaledDeltaTime : Time.deltaTime;
            PositionTiles();
        }

        private void PositionTiles()
        {
            if (_sprite == null) return;
            int widthPixels = Mathf.RoundToInt(_sprite.rect.width);
            int period = widthPixels * 2;
            int offset = Mathf.FloorToInt(_elapsed * _pixelsPerSecond) % period;
            int first = Mathf.FloorToInt((float)offset / widthPixels) - 1;
            float pixelsPerUnit = _sprite.pixelsPerUnit;
            for (int index = 0; index < TileCount; index++)
            {
                int tileNumber = first + index;
                float x = (tileNumber * widthPixels - offset + widthPixels * 0.5f) / pixelsPerUnit;
                _tiles[index].transform.localPosition = new Vector3(x, 0f, 0f);
                _tiles[index].flipX = (tileNumber & 1) != 0;
            }
        }
    }
}
