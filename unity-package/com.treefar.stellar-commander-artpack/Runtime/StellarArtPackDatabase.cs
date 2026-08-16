using System;
using System.Collections.Generic;
using UnityEngine;

namespace Treefar.StellarCommanderArt
{
    public static class StellarArtPackDatabase
    {
        private const string ManifestPath = "StellarCommanderArt/unity-artpack";
        private static StellarArtPackData _data;
        private static readonly Dictionary<string, UnitRuntime> Units = new();
        private static readonly Dictionary<string, Sprite> Scenery = new();

        private sealed class UnitRuntime
        {
            public readonly StellarArtPackData.UnitDef Def;
            public readonly Texture2D Texture;
            public readonly Dictionary<string, Sprite[]> States = new();

            public UnitRuntime(StellarArtPackData.UnitDef def, Texture2D texture)
            {
                Def = def;
                Texture = texture;
            }
        }

        public static StellarArtPackData.StateDef GetState(string unitId, string stateName)
        {
            UnitRuntime unit = GetUnit(unitId);
            if (unit == null) return null;
            foreach (StellarArtPackData.StateDef state in unit.Def.states)
                if (state.name == stateName) return state;
            return null;
        }

        public static Sprite GetFrame(string unitId, string stateName, int frameIndex)
        {
            UnitRuntime unit = GetUnit(unitId);
            if (unit == null) return null;
            if (!unit.States.TryGetValue(stateName, out Sprite[] frames))
            {
                StellarArtPackData.StateDef state = GetState(unitId, stateName);
                if (state == null) return null;
                frames = BuildFrames(unit.Texture, state);
                unit.States.Add(stateName, frames);
            }
            return frames[Mathf.Clamp(frameIndex, 0, frames.Length - 1)];
        }

        public static Sprite GetScenery(string sceneryId)
        {
            EnsureLoaded();
            if (Scenery.TryGetValue(sceneryId, out Sprite cached)) return cached;
            foreach (StellarArtPackData.SceneryDef def in _data.scenery)
            {
                if (def.id != sceneryId) continue;
                Texture2D texture = Resources.Load<Texture2D>(def.texture);
                if (texture == null) return null;
                texture.filterMode = FilterMode.Point;
                texture.wrapMode = TextureWrapMode.Clamp;
                Sprite sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height),
                    new Vector2(0.5f, 0.5f), _data.pixelsPerUnit, 0, SpriteMeshType.FullRect,
                    Vector4.zero, false);
                sprite.name = $"ENV_{def.id}";
                Scenery.Add(sceneryId, sprite);
                return sprite;
            }
            return null;
        }

        private static UnitRuntime GetUnit(string unitId)
        {
            EnsureLoaded();
            if (Units.TryGetValue(unitId, out UnitRuntime cached)) return cached;
            foreach (StellarArtPackData.UnitDef def in _data.units)
            {
                if (def.id != unitId) continue;
                Texture2D texture = Resources.Load<Texture2D>(def.texture);
                if (texture == null) return null;
                texture.filterMode = FilterMode.Point;
                texture.wrapMode = TextureWrapMode.Clamp;
                UnitRuntime unit = new(def, texture);
                Units.Add(unitId, unit);
                return unit;
            }
            return null;
        }

        private static Sprite[] BuildFrames(Texture2D texture, StellarArtPackData.StateDef state)
        {
            Sprite[] frames = new Sprite[state.frames];
            float y = texture.height - (state.row + 1) * _data.cellHeight;
            for (int index = 0; index < state.frames; index++)
            {
                Rect rect = new(index * _data.cellWidth, y, _data.cellWidth, _data.cellHeight);
                frames[index] = Sprite.Create(texture, rect, new Vector2(0.5f, 0.5f),
                    _data.pixelsPerUnit, 0, SpriteMeshType.FullRect, Vector4.zero, false);
                frames[index].name = $"{state.name}_{index:00}";
            }
            return frames;
        }

        private static void EnsureLoaded()
        {
            if (_data != null) return;
            TextAsset manifest = Resources.Load<TextAsset>(ManifestPath);
            if (manifest == null) throw new InvalidOperationException($"Missing artpack manifest: Resources/{ManifestPath}.json");
            _data = JsonUtility.FromJson<StellarArtPackData>(manifest.text);
            if (_data == null || _data.units == null || _data.units.Length == 0)
                throw new InvalidOperationException("Stellar Commander artpack manifest is empty or invalid.");
        }
    }
}
