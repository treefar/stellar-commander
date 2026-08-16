using System;

namespace Treefar.StellarCommanderArt
{
    [Serializable]
    public sealed class StellarArtPackData
    {
        public int version;
        public int pixelsPerUnit;
        public int cellWidth;
        public int cellHeight;
        public UnitDef[] units;
        public SceneryDef[] scenery;

        [Serializable]
        public sealed class UnitDef
        {
            public string id;
            public string texture;
            public StateDef[] states;
        }

        [Serializable]
        public sealed class StateDef
        {
            public string name;
            public int row;
            public int frames;
            public float fps;
            public bool loop;
        }

        [Serializable]
        public sealed class SceneryDef
        {
            public string id;
            public string texture;
            public int width;
            public int height;
        }
    }
}
