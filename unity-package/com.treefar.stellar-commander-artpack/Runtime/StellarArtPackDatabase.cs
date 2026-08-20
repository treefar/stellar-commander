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
        private static readonly Dictionary<string, FacilityRuntime> Facilities = new();
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

        private sealed class FacilityRuntime
        {
            public readonly StellarArtPackData.FacilityDef Def;
            public readonly Texture2D Texture;
            public readonly Dictionary<string, Sprite[]> States = new();

            public FacilityRuntime(StellarArtPackData.FacilityDef def, Texture2D texture)
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

        public static Sprite GetFacilityFrame(string facilityId, string stateName, int frameIndex)
        {
            FacilityRuntime facility = GetFacility(facilityId);
            if (facility == null) return null;
            if (!facility.States.TryGetValue(stateName, out Sprite[] frames))
            {
                StellarArtPackData.StateDef state = null;
                foreach (StellarArtPackData.StateDef candidate in facility.Def.states)
                    if (candidate.name == stateName) { state = candidate; break; }
                if (state == null) return null;
                frames = BuildFrames(facility.Texture, state);
                facility.States.Add(stateName, frames);
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

        private static FacilityRuntime GetFacility(string facilityId)
        {
            EnsureLoaded();
            if (Facilities.TryGetValue(facilityId, out FacilityRuntime cached)) return cached;
            if (_data.facilities == null) return null;
            foreach (StellarArtPackData.FacilityDef def in _data.facilities)
            {
                if (def.id != facilityId) continue;
                Texture2D texture = Resources.Load<Texture2D>(def.texture);
                if (texture == null) return null;
                texture.filterMode = FilterMode.Point;
                texture.wrapMode = TextureWrapMode.Clamp;
                FacilityRuntime facility = new(def, texture);
                Facilities.Add(facilityId, facility);
                return facility;
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
