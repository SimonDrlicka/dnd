#!/usr/bin/env python3
"""
Example usage of the D&D utilities package
"""

from dnd import roll_dice


def main():
    """Demonstrate dice rolling functionality"""
    print("D&D Dice Roller Example")
    print("=" * 40)
    
    dice_rolls = [
        ("1d20", "Attack roll"),
        ("2d6+3", "Damage with modifier"),
        ("4d6", "Character ability score"),
        ("1d100", "Percentile roll"),
    ]
    
    for notation, description in dice_rolls:
        result = roll_dice(notation)
        print(f"{description:30} {notation:10} = {result}")


if __name__ == "__main__":
    main()
